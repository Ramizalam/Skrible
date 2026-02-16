import React, { useEffect, useMemo, useState } from 'react'
import store from '../store'
import Button from './Button';
import { roundService } from '../service/RoundServices';
import Notification from './Notification';
import { observer } from 'mobx-react-lite';

interface Props{

}


const EventNotifier : React.FC<Props> = () => {

  const { currentPlayerId,choosing,myChance,wordList,currentWord} = store.gameStore;

  const drawer = store.gameStore.getPlayerById(currentPlayerId!);


  // first show the 4 words to the drawer and if drawer click one of the word to will emit an event to other user that the game has Started and other will see _ _ _ _ on their website

  const memorizedWord = useMemo(()=>{
       return wordList.map((word)=>(
        <Button onClick={()=>roundService.roundSyncClient(word)}
        key={word}
        >
         {word} 
       </Button>
       ))
  },[myChance,choosing,wordList])

  const [notifySelection,setNotifySelection] = useState(false);
  const[wordReveal , setWordReveal]  = useState(false);

    useEffect(()=>{
      if(myChance || !drawer)  return;
        setNotifySelection(true);
        setTimeout(()=>{
          setNotifySelection(false);
        },2000)
      
    },[choosing,myChance,drawer])


    useEffect(()=>{
      if(myChance || choosing) return;

      if(currentWord){
        setWordReveal(true);
        setTimeout(()=>{
          setWordReveal(false);
        },2000)
      }
    },[myChance,currentWord])


  return (
    // this will be seen by the drawer 
    <>
    <Notification open ={choosing && myChance && !currentWord} >
        <div className='flex flex-col items-center space-y-4'>
        <h2>Choose a Word</h2>
        {memorizedWord}
        </div>
      </Notification>  

       <Notification open={wordReveal}>
        <h2>Word was {currentWord}</h2>
      </Notification>

        {/* this will be seen by  other player */}
      <Notification open={notifySelection} >  
        <>
        {choosing?(
          <span>
            <span  className='text-green-700 '>{drawer?.name}</span> is choosing a word
          </span>
        ):(
          <span>
            <span className="text-green-700">{drawer?.name}</span> starts
              drawing
          </span>
        )}
        
        </>
      </Notification>
    
    </>
  )
}

export default observer(EventNotifier);