import React, { useCallback, useState } from 'react'
import store from '../store'
import { roundService } from '../service/RoundServices';
import Input from './Input';
import Button from './Button';
import { GrSend } from 'react-icons/gr';
import { observer } from 'mobx-react';

interface Props{ }

const ChatArea :React.FC<Props> = () => {
    const [message, setMessage] = useState("")
    const{me ,myChance} = store.gameStore;
    const handleOnchange = useCallback((event:any)=>{
        if(!myChance){
            setMessage(event.target.value);
        }
    },[myChance])

    const {chats} = store.chatStore;

    const sendMessage = ()=>{
        if(me && message.trim() !== '' && !myChance){
            store.chatStore.addChat({by:me.name , message:message.trim()});
            roundService.chatClient(message.trim());
            setMessage('')
        }
    }

  return (
    <div>
        <div className='text-xl h-3/2 lg:h-9/10 tracking-wide overflow-auto'>
            {chats.map((chat)=>(
             <p className='my-1 bg-gray-200 p-2' key={chat.by+chat.message}>
                <span className='text-green-200 mr-2 break-normal'>
                    {chat.by}
                </span>
                {chat.message}
             </p>
            )
            )}
        </div>
        <div>
            <Input value={message}
            onchange={handleOnchange}
            placeholder={`Enter your Message`}
            />
            <Button onClick={sendMessage} icon={GrSend} iconBorder={false}/>
        </div>
    </div>
  )
}

export default  observer(ChatArea);