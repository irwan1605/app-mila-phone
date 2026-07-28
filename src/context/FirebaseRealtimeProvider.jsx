import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    listenPenjualan,
    listenStockAll,
    listenInventory,
    listenTransfer,
    listenUsers,
    listenMasterBarang,
    listenMasterBank,
    listenMasterTenor,
    listenMasterMDR,
    listenMasterStoreHead,
    listenKaryawan,
} from "../services/FirebaseService";

const FirebaseRealtimeContext = createContext(null);

export function FirebaseRealtimeProvider({ children }) {

    const mounted = useRef(true);

    //---------------------------------------
    // PENJUALAN
    //---------------------------------------

    const [penjualan,setPenjualan]=useState([]);

    //---------------------------------------
    // STOCK
    //---------------------------------------

    const [stock,setStock]=useState({});

    //---------------------------------------
    // INVENTORY
    //---------------------------------------

    const [inventory,setInventory]=useState([]);

    //---------------------------------------
    // TRANSFER
    //---------------------------------------

    const [transfer,setTransfer]=useState([]);

    //---------------------------------------
    // USERS
    //---------------------------------------

    const [users,setUsers]=useState([]);

    //---------------------------------------
    // MASTER
    //---------------------------------------

    const [masterBarang,setMasterBarang]=useState([]);

    const [masterBank,setMasterBank]=useState([]);

    const [masterTenor,setMasterTenor]=useState([]);

    const [masterMDR,setMasterMDR]=useState([]);

    const [masterStoreHead,setMasterStoreHead]=useState([]);

    const [masterKaryawan,setMasterKaryawan]=useState([]);

    //---------------------------------------
    // STATUS
    //---------------------------------------

    const [ready,setReady]=useState(false);

    useEffect(()=>{

        mounted.current=true;

        const unsubs=[];

        //---------------------------------------
        // Penjualan
        //---------------------------------------

        unsubs.push(

            listenPenjualan((rows)=>{

                if(!mounted.current) return;

                setPenjualan(Array.isArray(rows)?rows:[]);

            })

        );

        //---------------------------------------
        // Stock
        //---------------------------------------

        unsubs.push(

            listenStockAll((rows)=>{

                if(!mounted.current) return;

                setStock(rows||{});

            })

        );

        //---------------------------------------
        // Inventory
        //---------------------------------------

        if(typeof listenInventory==="function"){

            unsubs.push(

                listenInventory((rows)=>{

                    if(!mounted.current) return;

                    setInventory(rows||[]);

                })

            );

        }

        //---------------------------------------
        // Transfer
        //---------------------------------------

        if(typeof listenTransfer==="function"){

            unsubs.push(

                listenTransfer((rows)=>{

                    if(!mounted.current) return;

                    setTransfer(rows||[]);

                })

            );

        }

        //---------------------------------------
        // Users
        //---------------------------------------

        if(typeof listenUsers==="function"){

            unsubs.push(

                listenUsers((rows)=>{

                    if(!mounted.current) return;

                    setUsers(rows||[]);

                })

            );

        }

        //---------------------------------------
        // MASTER BARANG
        //---------------------------------------

        if(typeof listenMasterBarang==="function"){

            unsubs.push(

                listenMasterBarang(setMasterBarang)

            );

        }

        //---------------------------------------
        // MASTER BANK
        //---------------------------------------

        if(typeof listenMasterBank==="function"){

            unsubs.push(

                listenMasterBank(setMasterBank)

            );

        }

        //---------------------------------------
        // MASTER TENOR
        //---------------------------------------

        if(typeof listenMasterTenor==="function"){

            unsubs.push(

                listenMasterTenor(setMasterTenor)

            );

        }

        //---------------------------------------
        // MASTER MDR
        //---------------------------------------

        if(typeof listenMasterMDR==="function"){

            unsubs.push(

                listenMasterMDR(setMasterMDR)

            );

        }

        //---------------------------------------
        // STORE HEAD
        //---------------------------------------

        if(typeof listenMasterStoreHead==="function"){

            unsubs.push(

                listenMasterStoreHead(setMasterStoreHead)

            );

        }

        //---------------------------------------
        // KARYAWAN
        //---------------------------------------

        if(typeof listenKaryawan==="function"){

            unsubs.push(

                listenKaryawan(setMasterKaryawan)

            );

        }

        setReady(true);

        return ()=>{

            mounted.current=false;

            unsubs.forEach(fn=>{

                if(typeof fn==="function"){

                    fn();

                }

            });

        };

    },[]);

    //---------------------------------------
    // VALUE
    //---------------------------------------

    const value=useMemo(()=>({

        ready,

        penjualan,

        stock,

        inventory,

        transfer,

        users,

        masterBarang,

        masterBank,

        masterTenor,

        masterMDR,

        masterStoreHead,

        masterKaryawan,

    }),[
        ready,
        penjualan,
        stock,
        inventory,
        transfer,
        users,
        masterBarang,
        masterBank,
        masterTenor,
        masterMDR,
        masterStoreHead,
        masterKaryawan,
    ]);

    return(

        <FirebaseRealtimeContext.Provider value={value}>

            {children}

        </FirebaseRealtimeContext.Provider>

    );

}

export function useFirebaseRealtime(){

    return useContext(FirebaseRealtimeContext);

}