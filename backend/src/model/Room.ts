import type { Socket } from "socket.io";
import BaseSchema from "./_base.js";
import Player from "./Player.js";
import type { PlayerDTO } from "../DTO/playerDTO.js";
import { mapService } from "../services/MapService.js";


export interface RoomSetting{
    total_rounds : number,
    round_time : number
}

class Room extends BaseSchema{
    private _players: string[];
    private _currentRound : number;
    private _roundStartTime : number;
    private _currentPlayerIndex : number;
    private _scores : {[key:string]:number};
    private _currentWord : string;
    private _guessedPlayer : string[];
    private _gameStarted : boolean;
    private _chanceCount : number;
    private _roomSetting : RoomSetting;

    public constructor(id:string,roomSetting : RoomSetting){
        super(id);
        this._players =[];
        this._currentRound= 1;
        this._roundStartTime =  Date.now();
        this._scores = {};
        this._currentPlayerIndex =0;
        this._gameStarted =false;
        this._chanceCount=1;
        this._currentWord ="";
        this._updateCache();
        this._guessedPlayer=[]
        this._roomSetting = roomSetting;
    }

    private _updateCache(){
       mapService?.setEntity<Room>(this.id, this);
    }

    public get chanceCount():number{
        return this._chanceCount;
    }

    public setChanceCount(count : number){
         this._chanceCount = count;
    }

    public resetScore(){
        for(const playerId of this._players){
            this._scores[playerId] =0;
        }
        this._updateCache();
    }


    public getGuessPlayerCount():number{
        return this._guessedPlayer.length;
    }

    public updateCurrentRound(round:number){
        this._currentRound =round;
        this._updateCache();
    }

    public isFinalOver():boolean{
        return this._currentRound>= this._roomSetting.total_rounds;
    }

    public get timeElapsed(): number {
       return Math.floor((Date.now() - this._roundStartTime) / 1000);
    }

        // adding newplayer who guessed the word  to the gueesPlayer List
    public isAlreadyGuessed(playerId:string) :boolean{
        return this._guessedPlayer.includes(playerId);
    }

    public markPlayerGuessed(playerId:string){
        this._guessedPlayer.push(playerId);
        //mapservice
        mapService?.setEntity<Room>(this.id, this);
    }


    public updateToNextPlayer(){
        this._currentPlayerIndex++;
        this._currentPlayerIndex = this._currentPlayerIndex % this._players.length;
        this._updateCache();
    }


    public get currentRound():number{
        return this._currentRound;
    }


    public setCurrentPlayerIndex(idx:number){
        this._currentPlayerIndex =idx;
        this._updateCache();
    }

    public get currentPlayerIndex():number{
        return this._currentPlayerIndex;
    }

    public get scores():{[key:string]:number}{
        return this._scores;
    }

    public get currentWord():string{
        return this._currentWord;
    }

    public changeScore(playerId:string,score:number){
      this._scores[playerId] =score;
      this._updateCache();
    }

    public get roomSetting(): RoomSetting {
        return this._roomSetting;
    }

    public updateSetting(setting : RoomSetting){
        this._roomSetting = setting;
        this._updateCache();
    }

    public addPlayer(socket:Socket,playerPayload : PlayerDTO):Player{
        const player = new Player(
            socket,
            playerPayload.name,
            playerPayload.role!,
            playerPayload.avatar
        )
        player.joinRoom(this.id);
        this._players.push(player.id);
        this._updateCache();
        return player;
    }

    public removePlayer(playerId : string){
        const pos = this._players.findIndex(p => p === playerId);
        if (pos === -1) return;
        const playerToRemove = this._players[pos]!; 
        delete this._scores[playerToRemove];
        //@ts-ignore
        this.players[pos] = this.players[this.players.length -1];
        this.players.pop();
        this._updateCache();
    }

    public get players(): string[] {
       return this._players;
     }

     public resetRound(){
        this._roundStartTime = Date.now();
        this._guessedPlayer = [];
        this._updateCache();
     }

     public setGameStarted(start:boolean){
        this._gameStarted = start;
        this._updateCache();
     }

     public get gameStarted():boolean{
        return this.gameStarted;
     }

     public setCurrentWord(word : string){
        return this._currentWord = word;
     }

}


export default Room;