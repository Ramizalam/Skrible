import  { Server } from "socket.io";
import {Server as httpServer} from "http"
import GameHandler from "../handler/GameHandler.js";
import { Socket } from "socket.io";
import { EventTypeEnum } from "../enum/EventTypeEnum.js";



class WebSocketServices{
     private static _instance: WebSocketServices|null;
     private io : Server|null=null;
     private constructor(){}

     public static getInstance():WebSocketServices{
        if(!WebSocketServices._instance){
            WebSocketServices._instance = new WebSocketServices()
        }
        return WebSocketServices._instance;
     }
     
     public init(server :httpServer){
        this.io = new Server(server,{
            transports:["websocket"],
            cors:{
                origin:["https://localhost:3000"]
            }
        })

        this.io.on("connection",(socket)=>{
            Object.values(GameHandler).map(handler=>handler(socket));
        })
     }

     public sendPrivate(socket:Socket ,event:EventTypeEnum, message:any){
        this.io?.to(socket.id).emit(event,message)
     }

     public sendToRoom(socket: Socket,event: string, roomId: string,message: any) {
          socket.to(roomId).emit(event, message);
      }

     public sendToAll(socket:Socket,event:string,message:any){
        socket.broadcast.emit(event,message);
     }
      public sendToRoomByIO(event: string, roomId: string, message: any) {
          this.io?.to(roomId).emit(event, message);
      }

}

export const webSocketServices = WebSocketServices.getInstance();