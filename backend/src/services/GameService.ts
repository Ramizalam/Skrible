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


class GameService {
  private static _instance: GameService | null;
  private constructor() { };
  public static getInstance() {
    if (!GameService._instance) {
      GameService._instance = new GameService();
    }
    return GameService._instance;
  }

  public createGame(socket: Socket, payload: PlayerDTO) {
    const uniqueRoomId = Helper.generateRandomString(8, {
      includeLowerCase: true,
      includeUpperCase: true,
      includeNumbers: false
    })

    const room = new Room(uniqueRoomId, {
      total_rounds: 4,
      round_time: 60,
    });

    const player = room.addPlayer(socket, {
      id: socket.id,
      name: payload.name,
      role: UserRoleEnum.CREATOR,
      avatar: payload.avatar
    })

    webSocketServices.sendPrivate(socket, EventTypeEnum.ROOM_SYNC, {
      player: player.toJson(),
      room_id: player.roomId,
      game_state: GameStateEnum.LOBBY,
      player_status: 0,
      me: player.id,
    })
  }

  public joinGame(socket: Socket, payload: PlayerDTO, roomId: string) {
    console.log(`[GameService] joinGame called for room ${roomId}`);
    const room = mapService.getEntity<Room>(roomId);
    if (!room) {
      console.log("invalid room id")
      webSocketServices.sendPrivate(
        socket,
        EventTypeEnum.ERROR,
        "Invalid Room Id"
      );
      return;
    }

    if (room.gameStarted) {
      return;
    }
    const player = room.addPlayer(socket, {
      id: socket.id,
      name: payload.name,
      role: UserRoleEnum.JOINER,
      avatar: payload.avatar
    });

    // socket.join(roomId);
    console.log(`[GameService] Player ${player.id} joined room ${roomId}`);

    const playerIds = room.players;
    const players = playerIds.map((id) => {
      const player = mapService.getEntity<Player>(id);
      return player?.toJson();
    })

    webSocketServices.sendPrivate(socket, EventTypeEnum.ROOM_SYNC, {
      room_id: player.roomId,
      game_state: GameStateEnum.LOBBY,
      settings: room.roomSetting,
      me: player.id,
      player_status: 0,
      players,
    })

    webSocketServices.sendToRoom(socket, EventTypeEnum.ROOM_SYNC, room.id, {
      player: player.toJson(),
      settings: room.roomSetting,
      player_status: 0,
    });
  }

  public changeGameSetting(socket: Socket, setting: RoomSetting) {
    const { player, room } = gameHelperService.getPlayerAndRoom(socket);

    if (!player || !room) return;

    room.updateSetting(setting);
    webSocketServices.sendToRoom(socket, EventTypeEnum.ROOM_SYNC, room.id, {
      settings: room.roomSetting,
    })
  }

  public draw(socket: Socket, commands: Array<Array<number>>) {
    const { player, room } = gameHelperService.getPlayerAndRoom(socket, false);

    if (!player || !room) {
      return;
    }

    if (room.players[room.currentPlayerIndex] == player.id) {
      webSocketServices.sendToRoom(
        socket,
        EventTypeEnum.DRAW,
        room.id,
        { commands }
      )
    }
  }

  public leaveGame(socket: Socket) {
    const player = mapService.getEntity<Player>(socket.id);

    if (!player) {
      return;
    }

    if (!player.roomId) {
      return;
    }

    const room = mapService.getEntity<Room>(player.roomId);

    if (!room) {
      return;
    }

    mapService.remove(player.id);
    player.leaveRoom();
    if (room.players.length < 3) {
      mapService.remove(room.id);
      webSocketServices.sendToRoomByIO(EventTypeEnum.ERROR, room.id, {});
    } else {
      if (room.players[room.currentPlayerIndex] === player.id) {
        room.updateToNextPlayer();
        room.setCurrentWord("");
        room.resetRound();
        const nextPlayerId = room.players[room.currentPlayerIndex];
        webSocketServices.sendToRoomByIO(EventTypeEnum.ROUND_SYNC, room.id, {
          scores: room.scores,
          turn_player_id: nextPlayerId,
          round: room.currentRound,
          choosing: true,
          round_start: false,
          round_change: true,
        });
        webSocketServices.sendToRoomByIO(EventTypeEnum.DRAW, room.id, {
          commands: [[2]],
        });
        const nextPlayer = mapService.getEntity<Player>(nextPlayerId!);
        if (!nextPlayer) {
          console.log(
            "[Game Service] Something went wrong, next Player does not exist."
          );
          webSocketServices.sendToRoomByIO(
            EventTypeEnum.ERROR,
            room.id,
            "Server Error"
          );
        } else {
          webSocketServices.sendPrivate(
            nextPlayer.mySocket,
            EventTypeEnum.ROUND_SYNC,
            {
              word_list: gameHelperService.getRandomWords(),
            }
          );
        }
      }
      if (player.role === UserRoleEnum.CREATOR) {
        const nextPlayer = mapService.getEntity<Player>(room.players[0]!);
        nextPlayer?.update(UserRoleEnum.CREATOR);
        webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
          player_status: 2,
          player: nextPlayer?.toJson(),
        });
      }
      webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
        player_status: 1,
        player: player.toJson(),
      });
    }
    room.removePlayer(player.id);
  }

  public startGame(socket: Socket) {
    console.log("GameService: startGame called");
    const { player, room } = gameHelperService.getPlayerAndRoom(socket);
    if (!player || !room) {
      return;
    }

    const playerIds = room.players;
    console.log("GameService: Player Count:", playerIds.length);

    if (playerIds.length < 2) {
      console.log("GameService: Not enough players");
      return;
    }
    // choose any random player from the room to draw on canvas
    const drawer = mapService.getEntity<Player>(Helper.getRandom<string>(playerIds));

    if (!drawer) {
      console.log("GameService: Drawer not found");
      return;
    }

    room.setCurrentPlayerIndex(room.players.indexOf(drawer.id))
    room.resetScore();
    room.setGameStarted(true);

    webSocketServices.sendToRoomByIO(EventTypeEnum.ROUND_SYNC, room.id, {
      game_state: GameStateEnum.START,
      scores: room.scores,
      turn_player_id: drawer.id,
      round: room.currentRound,
      choosing: true,
      time_left: room.roomSetting.round_time
    });

    webSocketServices.sendToRoomByIO(EventTypeEnum.DRAW, room.id, {
      commands: [[2]],
    })

    webSocketServices.sendPrivate(drawer.mySocket, EventTypeEnum.ROUND_SYNC, {
      word_list: gameHelperService.getRandomWords(),
    })
  }

  public reGame(socket: Socket) {
    const { player, room } = gameHelperService.getPlayerAndRoom(socket);

    if (!player || !room) {
      return;
    }

    room.setGameStarted(false);
    room.setCurrentWord("");
    room.resetScore();
    room.resetRound();
    room.setCurrentPlayerIndex(-1);
    room.updateCurrentRound(1);
    webSocketServices.sendToRoomByIO(EventTypeEnum.ROOM_SYNC, room.id, {
      game_state: GameStateEnum.LOBBY,
    })

  }


}

export const gameService = GameService.getInstance();