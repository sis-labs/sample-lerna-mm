ø'use strict';

// Simple set of utilities for the application
const Utils = (function() {

    const { v4: uuid } = require('uuid');
    
    const getTime = () => new Date().getTime();

    const createCommand = (name, payload, correlationId = uuid()) => {
	const id = uuid();
	const ts = getTime();
	return {
	    id,
	    correlationId,
	    ts,
	    name,
	    payload
	};
    };
    
    return {
	getTime,
	uuid,
	createCommand,
    };
})();

// simple fake logger just to avoid the use of a huge bunch of dependedncies
const Logger = (function() {

    const log = (level,meta, message) => {
	const d = new Date();
	const logEvent = {
	    date: d.toISOString(),
	    level,
	    meta,
	    message
	};
	console.log(JSON.stringify(logEvent));
    };

    const trace = (meta, message) => {
	log('TRACE', meta, messsage);
    };

    const debug = (meta, message) => {
	log('DEBUG', meta, message);
    };

    const info = (meta, message) => {
	log('INFO', meta, message);
    }

    const warn = (meta, message) => {
	log('WARN', meta, message);
    }

    const error = (meta, message) => {
	log('ERROR', meta, message);
    }

    return {
	log,
	trace,
	debug,
	info,
	warn,
	error,
    };
	
})();

// Security stack for the application.
const Security = (function() {

    function getKeyPair() {};
    
    function encrypt(publicKey, payload) {};
    
    function decrypt(privateKey, payload) {};
    
    return {
	genKeyPair,
	encrypt,
	decrypt,
    };
})();

const EventContainer = (function(log, utils, security) {
    const EventEmitter = require('events');
    
    class ZxEventEmitter extends EventEmitter {}
    
    const emitter = new ZxEventEmitter();

    // This is a generic handler for error
    emitter.on('error', (err) => {
	log.error(`An error occured in the event container ${err.message || err}`);
    });

    /**
     * Dispatch an event according to some internal rules.
     *
     * TODO: this must be enriched witht eh filtering mechanism, the encryption
     * mechanism and so on.
     *
     * @param eventName the name of the event to dispatch (this is actually the topic to dispatch to)
     * @param eventType the type of the event
     * @param eventPayload the payload of the event
     * @param correlationId optional correlation id of the process
     * @return void
     */
    const dispatchEvent = (eventName, eventType, eventPayload, correlationId = uuid()) => {
	// we should validate the schema of the event here
	const id = uuid();
	const ts = getTime();
	const eventToDispatch = {id, correlationId, ts, type: eventType, payload: eventPayload};
	emitter.emit(eventName, eventToDispatch);
    };

    /**
     * Handle an event from the event
     *
     * TODO: add the decryption mechanism, the filtering mechanism and so on,
     *
     * @param eventName the name of the event to handle
     * @param handler the handler to invoke when the event is triggered
     * @return a subscription on the event
     */
    const handleEvent = (eventName, eventHandler) => emitter.on(eventName, eventHandler);

    /**
     * Handle an event from the event stream only once
     *
     * TODO: add the decryption mechanism, the filtering mechanism and so on,
     *
     * @param eventName the name of the event to handle
     * @param eventHandler the handler to invoke when the event is triggered
     * @return a subscription on the event
     */
    const handleEventOnce = (eventName, eventHandler) => emitter.once(eventName, eventHandler);

    /**
     * Unsubscribe an event handler
     *
     * @param eventName the name of the event
     * @param eventHandler the handler on the event
     * @return void
     */
    const unsubscribe = (eventName, eventhandler) => emitter.off(eventName, eventHandler);

    return {
	send: dispatchEvent,
	on: handleEvent,
	once: handleEventOnce,
	off: unsubscribe,
    };

})(Logger, Utils, Security);

const ApplicationOwner = (function(utils, security, eventContainer) {

    const Domain = (function(_) {
	
	// error codes of the domain
	const errorCodes = {
	    INVALID_NAME: 0x101,
	    INVALID_CONTACT: 0x102,
	    INVALID_CREATOR: 0x103,
	};

	// TODO: create schema per operation since each operation has it's own schema.
	// This is the general schema to use to persist information in the store
	const getSchema = () => (
        {
            "$schema": "http://json-schema.org/draft-07/schema",
            "$id": "https://schemas.groupemutuel.ch/eventhub/application-owner",
            "type": "object",
            "title": "An Application owner is the owner of an application which can produce events through an event stream.",
            "description": "Each application has an owner which is responsible of the application. He will be reach in case of question / problem and reports will be sent to him frequently.",
            "default": {},
            "examples": [
                {
                    "id": "7fb53d94-9e54-426b-b76c-5d097acc550b",
                    "version": 1,
                    "name": "gce",
                    "description": "this is a small description",
                    "contact": "jdoe@protonmail.com",
                    "createdBy": "7fb53d94-9e54-426b-b76c-5d097acc550b",
                    "createdAt": "2020-08-16T09:26:18.127Z",
                    "lastUpdateAt": "2020-08-16T09:26:18.127Z"
                }
            ],
            "required": [
                "id",
                "version", // version is added by the system for creation. In other situation the source version MUST be provided in ex: rest header x-item-version) and no version SHOULD be defined in the body
                "name",
                "contact",
                "createdBy",
            ],
            "properties": {
                "id": {
                    "$id": "#/properties/id",
                    "type": "string",
		    "format": "^[A-Fa-f\d]{8}-[A-Fa-f\d]{4}-4[A-Fa-f\d]{3}-[89ABab][A-Fa-f\d]{3}-[A-Fa-f\d]{12}$",
                    "title": "The unique ID of the application owner",
                    "description": "The unique id of the application owner. This is an uuid",
                    "default": "",
                    "examples": [
                        "7fb53d94-9e54-426b-b76c-5d097acc550b"
                    ]
                },
                "version": {
                    "$id": "#/properties/version",
                    "type": "integer",
                    "title": "The version of the record",
                    "description": "The version is a pure incremental number which defines the history of change in the record. Each update increment the version by 1 and client has to present the right version of the record to be authorize to change it",
                    "default": 1,
                    "examples": [
                        1
                    ]
                },
                "name": {
                    "$id": "#/properties/name",
                    "type": "string",
                    "title": "The unique name of the application owner",
                    "description": "Each application owner has a unique name which is actually usable to search the entity in the system.",
                    "default": "",
                    "examples": [
                        "gce"
                    ]
                },
                "description": {
                    "$id": "#/properties/description",
                    "type": "string",
                    "title": "The description of the application owner",
                    "description": "An applicatin owner may have a description which describes the entity. TODO: take care about the i18n regarding that.",
                    "default": "",
                    "examples": [
                        "this is a small description"
                    ]
                },
                "contact": {
                    "$id": "#/properties/contact",
                    "type": "string",
                    "title": "The contact email to communicate with the application owner",
                    "description": "An application owner is a team which is available for discussion. The contact provides the email address to communicate with which is usable on IM system, email and so on.",
                    "default": "",
                    "examples": [
                        "jdoe@protonmail.com"
                    ]
                },
                "createdBy": {
                    "$id": "#/properties/createdBy",
                    "type": "string",
                    "title": "Indicates the unique id of the person which initially creates the record",
                    "description": "We store the user which has initiated the creation of the record. We have to look into the event store system to show the ID of the requester for each entry in the event store.",
                    "default": "",
                    "examples": [
                        "7fb53d94-9e54-426b-b76c-5d097acc550b"
                    ]
                },
                "createdAt": {
                    "$id": "#/properties/createdAt",
                    "type": "string",
                    "title": "Indicates the date of the creation of the record.",
                    "description": "This field store the date of the creation of the record so that we track item history. The format of the string is an ISO-8601 with nanoseconds.",
                    "default": "",
                    "examples": [
                        "2020-08-16T09:26:18.127Z"
                    ]
                },
                "lastUpdateAt": {
                    "$id": "#/properties/lastUpdateAt",
                    "type": "string",
                    "title": "Indicates the date of the last change of the record.",
                    "description": "Indicates the date of the version which is actually reflect the last change in the state history.",
                    "default": "",
                    "examples": [
                        "2020-08-16T09:26:18.127Z"
                    ]
                }
            },
            "additionalProperties": true
        }
    );

	/**
	 * Create an application owner given his name, the description, the owner of the domain and  the creator of the domain.
	 *
	 * @param name the name of the domain
	 * @param description the description of the domain
	 * @param contact the contact of the domain
	 * @param creator the creator of the domain
	 * @return a promise resolve if everything is right and rejected otherwise
	 */
	const  createApplicationOwner = (name, description, contact, creator) => Promise.resolve({
	    id: _.uuid(),
	    name,
	    description,
	    contact,
	    createdBy: creator,
	    createdAt: _.getTime(),
	    lastUpdatedAt: _.getTime(), // the last update field should be set only for update
	});

	/**
	 * Validate the format and the content of an application owner object
	 *
	 * @param applicationOwner the application owner to validate
	 * @param creator the uuid of the creator of the application owner
	 * @return a promise resolved if the application owner is valid and rejected otherwise.
	 */
	const validateApplicationOwner = (applicationOwner, creator) => {
	    const { name, contact } = domain;
	    
	    if(!!name || name === "") {
		return Promise.reject({code: errorCodes.INVALID_NAME, message: 'the name of the domain is not valid'});
	    }
	    if(!!contact || contact === "") { // validate the pattern of the contact. This MUST be a valid email
		return Promise.reject({code: errorCodes.INVALID_CONTACT, message: 'the name of the contact is not valid'});
	    }
	    if(!!creator || creator === "") { // validate the pattern of the creator. This MUST be a valid uuid v4
		return Promise.reject({code: errorCodes.INVALID_CREATOR, message: 'the creator id is not valid'});
	    }
	    return Promise.resolve(domain);
	};

	return {
	    createApplicationOwner,
	    validateApplicationOwner,
	};
    })(utils);

    const Infrastructure = (function(domain) {
	const domains = new Map();

	/**
	 * Save or update a domain in the database. Here we are only supporting
	 * a full update (which means a complete replacement of the record if
	 * it exists).
	 *
	 * @param domain the domain to save
	 * @return a promise resolved if everything is ok and rejected otherwise
	 */
	const save = (domain) => {};

	/**
	 * FInd all items in the database.
	 *
	 * @todo: add pagination parameters and search capabilities
	 *
	 * @return a promise resolved with a list of items found in the database and rejected if something wrong happens
	 */
	const findAll = () => {};

	/**
	 * Find an item using his id
	 *
	 * @param id the id of the item to find
	 * @return a promise resolved when the item has been fetched and rejected otherwise
	 */
	const findById = (id) => {};

	/**
	 * Remove an item from the database using the id of this item
	 *
	 * @param id the id of the item to remove
	 * @return a promise resolved with the item deleted as payload. The promise is rejected if something wrong happens
	 */
	const remove = (id) => {};

	return {
	    save,
	    findAll,
	    findById,
	    remove,
	};
    })(Domain);

    const Services = (function(domain, infrastructure){
    })(Domain, Infrastructure);

    const UseCases = (function(domain, services){

	/**
	 * Search for a specific domain using a Lucene query
	 *
	 * @param query the lucene query used to search
	 * @return a promise resolved with the list of domain that match the search query or rejected if something goes wrong
	 */
	const searchApplicationOwner = (query) => {
	    return Promise.resolve([]);
	};

	/**
	 * Fetch a given domain using his id
	 *
	 * @param id the unique id of the domain
	 * @return a promise resolve with the domain informatio or rejected if the domain doesn't exists or if something goes wrong.
	 */
	const fetchApplicationOwner = (id) => {
	    return Promise.reject(new Error('not implemented yet'));
	};

	/**
	 * Create a new application owner in the system
	 *
	 * @param logger the logger to use to emit log event
	 * @param utils dependency to the application utilities
	 * @param applicationOnwer the applciation owner to create
	 * @param creatorId the application creator for the request
	 * @return a promise resolved if everything is perform successfully rejected othwerwise
	 */
	const createApplicationOwner = (logger, utils, applicationOwner, creatorId) => {
	    // process:
	    // 1 - generate meta information for the process
	    //   a - generate the correlation id for the process
	    // 2 - validate the request payload,
	    //   a - validate the user ability to create the item
	    //   b - validate the format of each field in the future domain object
	    // 3 - create the domain object
	    //   a - create the object from request
	    // 4 - check for existency
	    //   a - search in the database for unique keys (name here)
	    // 5 - create the command
	    //   a - load meta information from api / service to fill correct meta in the system (double check
	    //   b - generate the command (type ApplicationOwnerCreateCommand)
	    // 6 - Subscribe to process event
	    //   a - subscribe to failure event so that the creation can be rooled back
	    //   b - subscribe to the success event so that the context of the request can be cleaned up
	    // 7 - store the command
	    //   a - persist it on the event store
	    // 8 - dispatch events associated with the command
	    //   a - look for event to generate regarding the command
	    //   b - for each event generate the payload of the event
	    //   c - for each generated event distpatch it
	    //   d - for each generated event add an entry the promise result
	    // 9 - return the promise with information about the tracking
	};

	/**
	 * Performs an update of an application owner
	 *
	 * @param applicationOwner the udpated application owner
	 * @param updaterId the id of the user which has requested the action
	 * @return a promise resolve with information about the process and rejected otherwise
	 */
	const updateApplicationOwner = (applicationOwner, updaterId) => {};

	/**
	 * Delete an application owner from the system
	 *
	 * @param applicationOwner the application owner to delete
	 * @param deleterId the id of the user which has requested the deletion
	 * @return a promise resolved when the process has been successfully completed and rejected otherwise
	 */
	const deleteApplicationOwner = (applicationOwner, deleterId) => {};
	
	return {
	    searchApplicationOwner,
	    fetchApplicationOwner,
	    createApplicationOwner,
	    updateApplicationOwner,
	    deleteApplicationOwner,
	};
    })(Domain, Services);
    
})(Utils, Security, EventContainer);

const Application = (function(utils, security, eventContainer) {
    const m = new Map();

    const commandSide = (function() {})();
    const querySide = (function() {})();

    const infrastructure = (function() {})();
    const domain = (function() {})();
    const useCases = (function() {
	const createApplication = ({mame, description}, creator) => {
	    const ts = new Date().getTime();
	    const id = utils.uuid();
	    const createApplicationCommand = utils.createCommand('createApplicationCommand', { name, description });
	    };
	};
    })();

    const presentation = (function() {

	const rest = (function() {})();
	const graphql = (function() {})();
	const ws = (function() {})();
	const rpc = (function() {})();

	return {
	    rest,
	    graphql,
	    ws,
	    rpc
	};
    });

    return {
	...r
    };
})(Utils, Security, EventContainer);

module.exports = esh;

function esh() {
    // TODO
}
