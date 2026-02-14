import { Socket } from "socket.io";
import { gameHelperService } from "./GameHelperService.js";
import { webSocketServices } from "./webSocketServices.js";
import { EventTypeEnum } from "../enum/EventTypeEnum.js";
import { GameStateEnum } from "../enum/GameStateEnums.js";
import { mapService } from "./MapService.js";
import Player from "../model/Player.js";

class RoundService {
    private static _instance: RoundService | null;
    private constructor() { };

    public static getInstance() {
        if (!RoundService._instance) {
            return RoundService._instance = new RoundService();
        }
        return RoundService._instance;
    }

    public async wordReveal(socket: Socket) {
        const { player, room } = gameHelperService.getPlayerAndRoom(socket, false);

        if (!player || !room) {
            return;
        }

        webSocketServices.sendToRoom(socket, EventTypeEnum.WORD_REVEAL, room.id, {
            word: room.currentWord,
        })

        webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
            room_start: false
        })

        setTimeout(() => {
            this.roundSync(socket);
        }, 5000);
    }

    public async gameChat(socket: Socket, message: string) {
        const { player, room } = gameHelperService.getPlayerAndRoom(socket, false);
        if (!player || !room) {
            return;
        }
        const drawerId = room.players[room.currentPlayerIndex]!;

        //drawer can't type in the chat
        if (drawerId === player.id) {
            return;
        }

        if (room.checkGuessWord(message.trim() || "")) {
            if (room.isAlreadyGuessed(player.id)) {
                return;
            }
            const currScore = room.scores[player.id]!;
            const timeLeft = room.roomSetting.round_time - room.timeElapsed;
            if (timeLeft > 0) {
                //----change the core of player who guessed the word and also the drawer based on how quicky they got the answer

                room.changeScore(player.id, currScore + timeLeft * 5)
                room.changeScore(drawerId, room.scores[drawerId]! + timeLeft * 2);
                room.markPlayerGuessed(player.id)

                webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
                    scores: room.scores,
                    guessed_player_id: player.id,
                    timeLeft: timeLeft - 1,
                });

            }
                // if all the player in the room guessed the words then  revel the word
            if (room.getGuessPlayerCount() + 1 === room.players.length) {
                webSocketServices.sendToRoom(socket, EventTypeEnum.WORD_REVEAL, room.id, {
                    word: room.currentWord,
                })
                // start a new Round
                webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
                    roundStart: false
                });
                setTimeout(() => { this.roundSync(socket) }, 5000);
            }
        }else{
            // if the guess is wrong
            webSocketServices.sendToRoom(socket,EventTypeEnum.CHAT,room.id,{
                message: message,
                id:player.id
            })
        }

    }


    public async roundSync(socket:Socket,chosenWord?:string){
        const{player,room} = gameHelperService.getPlayerAndRoom(socket,false);
        if(!player || !room) return;

        if(chosenWord && chosenWord.trim()!=""){
            room.setCurrentWord(chosenWord),
            room.resetRound();
            webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC,room.id,{
                choosing: false,
                round_start:true,
                wordLength : chosenWord.length
            })
        }else{
             if(room.isFinalOver()){
                webSocketServices.sendToRoomByIO(EventTypeEnum.END_GAME,room.id,{
                    game_state:GameStateEnum.END,
                    scores: room.scores,
                });
             }else if(room.roomSetting.round_time-room.timeElapsed <=0 || room.getGuessPlayerCount()+1== room.players.length){
                   if(room.chanceCount ===room.players.length){
                      room.updateCurrentRound(room.currentRound+1);
                      room.setChanceCount(1);
                   }else{
                         room.setChanceCount(room.chanceCount +1);
                   }
                   room.updateToNextPlayer();
                   room.setCurrentWord("");
                   room.resetRound();
                   const  nextPlayerId  =  room.players[room.currentPlayerIndex];
                   webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC,room.id,{
                    scores : room.scores,
                    turn_player_id : nextPlayerId,
                    round: room.currentRound,
                    choosing:true,
                    round_change: true,
                   })

                   webSocketServices.sendToRoomByIO(EventTypeEnum.DRAW,room.id,{
                    commands:[[2]],
                   })

                   const nextPlayer = nextPlayerId ? mapService.getEntity<Player>(nextPlayerId) : undefined;
                   if(!nextPlayer){
                    console.log("[Game Service] something went wrong next player does not exist")
                     webSocketServices.sendToRoomByIO(EventTypeEnum.ERROR,room.id , "Server Error");
                   }else{
                    webSocketServices.sendPrivate(nextPlayer.mySocket,EventTypeEnum.ROOM_SYNC,{
                        word_list:gameHelperService.getRandomWords()
                    })
                   }
             }
        }
    }
}

export const  roundService = RoundService.getInstance();