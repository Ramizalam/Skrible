import type { Socket } from "socket.io";
import type { PlayerDTO } from "../DTO/playerDTO.js";
import { Helper } from "../utils/Helper.js";
import Room, { type RoomSetting } from "../model/Room.js";
import { UserRoleEnum } from "../enum/UserRoleEnum.js";
import { webSocketServices } from "./webSocketServices.js";
import { EventTypeEnum } from "../enum/EventTypeEnum.js";
import { GameStateEnum } from "../enum/GameStateEnums.js";
import { mapService } from "./MapService.js";
import Player from "../model/Player.js";
import { gameHelperService } from "./GameHelperService.js";
import { RuleTester } from "eslint";

class GameService{
    private static _instance: GameService |null;
    private constructor(){};
    public static  getInstance(){
         if(!GameService._instance){
            GameService._instance = new GameService();
         }
         return GameService._instance;
    }

    public createGame(socket:Socket,payload : PlayerDTO){
        const uniqueRoomId = Helper.generateRandomString(8,{
            includeLowerCase:true,
            includeUpperCase:true,
            includeNumbers:false
        })

        const room  = new Room(uniqueRoomId,{
            total_rounds: 4,
            round_time : 60,
        });

        const player = room.addPlayer(socket,{
            id: socket.id,
            name:payload.name,
            role:UserRoleEnum.CREATOR,
            avatar: payload.avatar
        })

        webSocketServices.sendPrivate(socket,EventTypeEnum.ROOM_SYNC,{
            player:player.toJson(),
            room_id : player.roomId,
            game_state: GameStateEnum.LOBBY,
            player_status:0,
            me:player.id,
        })
    }

    public joinGame(socket:Socket,payload:PlayerDTO,roomId : string){
        const room = mapService.getEntity<Room>(roomId);
        if(!room){
            console.log("invalid room id")
            webSocketServices.sendPrivate(
                socket,
                EventTypeEnum.ERROR,
                "Invalid Room Id"
            );
            return;
        }

        if(room.gameStarted){
            return;
        }
        const player  = room.addPlayer(socket,{
            id: socket.id,
            name:payload.name,
            role:UserRoleEnum.JOINER,
            avatar:payload.avatar
        });

        const playerIds = room.players;
        const players = playerIds.map((id)=>{
            const player = mapService.getEntity<Player>(id);
            return player?.toJson();
        })

        webSocketServices.sendPrivate(socket,EventTypeEnum.ROOM_SYNC,{
            room_id : player.roomId,
            game_state:GameStateEnum.LOBBY,
            setting: room.roomSetting,
            me:player.id,
            player_status:0,
            players,
        })
    }

    public changeRoomSetting(socket:Socket,setting:RoomSetting){
        const {player,room} = gameHelperService.getPlayerAndRoom(socket);

        if(!player || !room) return;

        room.updateSetting(setting);
        webSocketServices.sendToRoom(socket,EventTypeEnum.ROUND_SYNC,room.id,{
            setting:room.roomSetting,
        })
    }

    public draw(socket: Socket, commands : Array<Array<number>>){
        const {player, room} = gameHelperService.getPlayerAndRoom(socket,false);
        if(!player || !room){
            return;
        }

        if(room.players[room.currentPlayerIndex]==player.id){
            webSocketServices.sendToRoom(
                socket,
                EventTypeEnum.DRAW,
                room.id,
                commands
            )
        }
    }

    public leaveGame(socket: Socket) {
    const player = mapService?.getEntity<Player>(socket.id);
    if (!player || !player.roomId) return;

    const room = mapService?.getEntity<Room>(player.roomId);
    if (!room) {
        // Cleanup player even if room is gone
        mapService?.remove(player.id);
        return;
    }

    // 1. Identify if the leaving player is the current drawer BEFORE removing them
    const isCurrentDrawer = room.players[room.currentPlayerIndex] === player.id;
    const isCreator = player.role === UserRoleEnum.CREATOR;

    // 2. Remove player from the room's internal list first
    room.removePlayer(player.id);
    player.leaveRoom();
    mapService?.remove(player.id);

    // 3. Handle Game Logic: If room is now too small, destroy it
    if (room.players.length < 2) {
        webSocketServices.sendToRoomByIO(EventTypeEnum.ERROR, room.id, { message: "Not enough players." });
        mapService?.remove(room.id);
        return;
    }

    // 4. Handle Turn Management: If the drawer left, skip to next
    if (isCurrentDrawer) {
        // Since we removed the player, the index might need adjustment
        // or we simply trigger the next round logic
        room.updateToNextPlayer(); 
        room.setCurrentWord("");
        room.resetRound();

        const nextPlayerId = room.players[room.currentPlayerIndex];
        const nextPlayer = mapService?.getEntity<Player>(nextPlayerId || "");

        webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
            scores: room.scores,
            turn_player_id: nextPlayerId,
            round: room.currentRound,
            choosing: true,
            round_change: true
        });

        // Clear the canvas for the new drawer
        webSocketServices.sendToRoomByIO(EventTypeEnum.DRAW, room.id, { commands: [[2]] });

        if (nextPlayer?.mySocket) {
            webSocketServices.sendPrivate(nextPlayer.mySocket, EventTypeEnum.ROOM_SYNC, {
                word_list: gameHelperService.getRandomWords()
            });
        }
    }

    // 5. Handle Creator Migration
    if (isCreator && room.players.length > 0) {
        const newCreatorId = room.players[0];
        const newCreator = mapService?.getEntity<Player>(newCreatorId || "");
        if (newCreator) {
            newCreator.update(UserRoleEnum.CREATOR);
            webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
                player_status: 2, // Role Update status
                player: newCreator.toJson()
            });
        }
    }

    // 6. Notify everyone that the player left
    webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
        player_status: 1, // Leave status
        player: player.toJson()
    });
    }

    public startGame(socket: Socket){
        const{player ,room} = gameHelperService.getPlayerAndRoom(socket);
        if(!player || !room) return;

        const playerIds =  room.players;

        if(playerIds.length<2) return;
        // choose any random player from the room to draw on canvas
        const drawer  = mapService.getEntity<Player>(Helper.getRandom<string>(playerIds));

        if(!drawer){
            return;
        }

        room.setCurrentPlayerIndex(room.players.indexOf(drawer.id))
        room.resetScore();
        room.setGameStarted(true);

        webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC,room.id,{
            game_state : GameStateEnum.START,
            scores:room.scores,
            turn_player_id : drawer.id,
            round : room.currentRound,
            choosing: true,
            time_left : room.roomSetting.round_time
        });

        webSocketServices.sendToRoomByIO(EventTypeEnum.DRAW,room.id,{
            commands:[[2]],
        })

        webSocketServices.sendPrivate(drawer.mySocket,EventTypeEnum.ROOM_SYNC,{
            word_list:gameHelperService.getRandomWords(),
        })
    }

    public reGame(socket: Socket){
        const {player,room} = gameHelperService.getPlayerAndRoom(socket);

        if(!player || !room){
            return;
        }

        room.setGameStarted(false);
        room.resetScore();
        room.resetRound();
        room.setCurrentPlayerIndex(-1);
        room.updateCurrentRound(1);
        webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC,room.id,{
            game_state: GameStateEnum.LOBBY,
        })

    }

}

export const gameService = GameService.getInstance();