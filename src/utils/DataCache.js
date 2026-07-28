// =======================================================
// DataCache.js
// Enterprise Memory Cache
// Single Source Of Truth
// =======================================================

class DataCache {

    constructor(){

        this.store = {};

        this.listeners = {};

        this.timestamps = {};

    }

    // ===================================================
    // GET
    // ===================================================

    get(key){

        return this.store[key];

    }

    // ===================================================
    // SET
    // ===================================================

    set(key,value){

        this.store[key]=value;

        this.timestamps[key]=Date.now();

        this.notify(key);

    }

    // ===================================================
    // UPDATE OBJECT
    // ===================================================

    update(key,callback){

        const current=this.store[key];

        const next=callback(current);

        this.store[key]=next;

        this.timestamps[key]=Date.now();

        this.notify(key);

    }

    // ===================================================
    // HAS
    // ===================================================

    has(key){

        return key in this.store;

    }

    // ===================================================
    // CLEAR KEY
    // ===================================================

    clear(key){

        delete this.store[key];

        delete this.timestamps[key];

        this.notify(key);

    }

    // ===================================================
    // CLEAR ALL
    // ===================================================

    clearAll(){

        this.store={};

        this.timestamps={};

        Object.keys(this.listeners).forEach((key)=>{

            this.notify(key);

        });

    }

    // ===================================================
    // AGE
    // ===================================================

    getAge(key){

        if(!this.timestamps[key]) return null;

        return Date.now()-this.timestamps[key];

    }

    // ===================================================
    // SUBSCRIBE
    // ===================================================

    subscribe(key,callback){

        if(!this.listeners[key]){

            this.listeners[key]=new Set();

        }

        this.listeners[key].add(callback);

        return ()=>{

            this.listeners[key].delete(callback);

        };

    }

    // ===================================================
    // NOTIFY
    // ===================================================

    notify(key){

        if(!this.listeners[key]) return;

        const value=this.store[key];

        this.listeners[key].forEach(fn=>{

            try{

                fn(value);

            }

            catch(err){

                console.error(err);

            }

        });

    }

}

const cache=new DataCache();

export default cache;