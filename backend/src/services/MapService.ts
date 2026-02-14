import type BaseSchema from "../model/_base.js";


class MapService{
    private static _instance : MapService|null;
      private map = new Map<string, unknown>();
    private constructor(){}

    public static getInstance(){
        if(!MapService._instance){
            MapService._instance = new MapService();
        }
        return MapService._instance;
    }

    public setEntity<T> (id:string,value:T): void{
        this.map.set(id,value)
    }

    public getEntity<T>(id : string):T|undefined{
        return this.map.get(id) as T | undefined;
    }

    public remove(id : string){
        return this.map.delete(id);
    }

    public has(id: string) : boolean{
        return this.map.has(id);
    }

}

export  const  mapService =  MapService.getInstance();