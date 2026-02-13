import type { Socket } from "socket.io";
import BaseSchema from "./_base.js";
import type { UserRoleEnum } from "../enum/UserRoleEnum.js";
import { mapService } from "../services/MapService.js";

class Player extends BaseSchema{
    private _roomId : string | undefined;

    public constructor(
        private _socket:Socket,
        private _name : string,
        private _role : UserRoleEnum,
        private _avatar : string,
    ){
        super(_socket.id);
    }

    public get mySocket():Socket{
        return this._socket;
    }

    public joinRoom(roomId:string){
        this._roomId = roomId;
        this._socket.join(roomId);
    }

    public leaveRoom(){
        this._socket.leave(this._roomId!);
        this._roomId = undefined;
    }

    public get name():string{
        return this._name;
    }

    
    public get avatar():string{
        return this._avatar;
    }

    
    public get roomId():string|undefined{
        return this._roomId;
    }

    public get role():UserRoleEnum{
        return this._role;
    }

    public update(newRole: UserRoleEnum){
        this._role = newRole;
        mapService?.setEntity<Player>(this.id,this)
    }

     public toJson() {
        return {
        name: this._name,
        id: this.id,
        role: this._role,
        avatar: this._avatar,
        };
     }
}


export default Player;