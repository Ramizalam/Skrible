import React, { useMemo } from 'react'
import store from '../store'
import { GameStateEnum } from '../enums/GameState';
import Avatar from './Avatar';
import avatarImage from '../assets/avatarImage.png'
import { observer } from 'mobx-react-lite';

interface  Props{}

const Player : React.FC<Props> = (props) => {

  const{topScorers:players,gameState} = store.gameStore;

  const memoPlayer = useMemo(()=>{
    return players.map((player,index)=>{
      let pos:number|undefined;
      if(gameState===GameStateEnum.END){
        if(index===0 || index ===1 || index==2){
          pos = index+1;
        }
      }
      return (
        <Avatar name={player.name}
          pos={pos}
          id={player.id}
          key ={player.id}
          score={player.score}
          src={player.avatar || avatarImage  }
        
        />
      )
    })
  },[gameState,players])


  return (
    <div className='fixed h-1/5 w-full bottom-0 overflow-x-auto flex overflow-y-hidden items-baseline justify-center'>{memoPlayer}</div>
  )
}

export default observer(Player)