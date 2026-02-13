import fs from "fs"
import type { Socket } from "socket.io";
import { mapService } from "./MapService.js";
import Player from "../model/Player.js";
import { webSocketServices } from "./webSocketServices.js";
import { EventTypeEnum } from "../enum/EventTypeEnum.js";
import { UserRoleEnum } from "../enum/UserRoleEnum.js";
import type Room from "../model/Room.js";
import { error } from "console";


class GameHelperService{
    private static _instance : GameHelperService|null;
    private readonly wordlist : string[];
     
    private constructor(){
         this.wordlist = fs.readFileSync("src/utils/word.txt", "utf-8").split(",\n");
    };

    public static getInstance() :GameHelperService{
        if(!GameHelperService._instance){
            GameHelperService._instance = new GameHelperService();
        }
        return GameHelperService._instance;
    }

    public getPlayer(socket: Socket){
        const player =  mapService?.getEntity<Player>(socket.id);
        if(!player){
            console.log("[game service] player does not exist")
            webSocketServices.sendPrivate(socket,
                EventTypeEnum.ERROR,
                "player does not exist"
            )
            return;
        }
        return player;
    }


    public checkPlayer( socket: Socket, player:Player,role :UserRoleEnum):boolean{
        if(player.role!==role){
            console.log('[Game Service] unauthorised Acess');
            webSocketServices.sendPrivate(socket,EventTypeEnum.ERROR,"unauthorised acess");
            return false;
        }
        return true;
    }


    public checkPlayerRoom(socket : Socket, player : Player): Room | undefined{
        const room =  mapService?.getEntity<Room>(player.roomId||" ");
        if(!room){
            console.log("[Game service] Invalid room Id")
            webSocketServices.sendPrivate(
                socket,
                EventTypeEnum.ERROR,
                "Invalid Room Id"
            )
            return;
        };

        if(!room.players.includes(player.id)){
            console.log('[Game Service] player does not belong to the room ')
            webSocketServices.sendPrivate(socket,EventTypeEnum.ERROR,"player does not belong to the room ")
            return;
        }
        return room; 
    }

    public getPlayerAndRoom(socket: Socket,roleCheck : boolean =true):{player?:Player;room?:Room} {
        // find the player 
        const player = this.getPlayer(socket);
        if(!player){
            return{};
        }
        if(roleCheck && this.checkPlayer(socket,player,UserRoleEnum.CREATOR)){
            return{};
        }

        // find the room 
        const room  = this.checkPlayerRoom(socket,player);
        if(!room){
            return{player};
        }
        return {player,room};
    }

   public getRandomWords(): string[] {
        const len = this.wordlist.length;
        if (len === 0) return [];

        const index = Math.floor(Math.random() * len);

        return [
            this.wordlist[index]!,
            this.wordlist[(index + 1) % len]!,
            this.wordlist[(index + 2) % len]!,
        ];
    }

}

export const gameHelperService = GameHelperService.getInstance();