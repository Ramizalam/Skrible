import React from 'react'
import store from '../store';
import { roundService } from '../service/RoundServices';
import { isLarge, isMedium, isSmall, userBreakingPoint } from '../hooks/useBreakPoint';
import Header from './Header';
import Timer from './Timer';
import LeaderBoard from './LeaderBoard';
import { options } from '../Helper/TabOption';
import { observer } from 'mobx-react';


interface Props {
    currentOption: number,
    handleOption: (val: number) => void;
}

const GameInfoArea: React.FC<Props> = ({ currentOption, handleOption }) => {
    const {
        round,
        currentPlayerId,
        roundStart,
        setting,
        wordLength,
        myChance,
        choosing
    } = store.gameStore;


    const drawer = store.gameStore.getPlayerById(currentPlayerId!);

    const onTimerEnd = () => {
        roundService.wordRevealClient();
    }
    const breakPoint = userBreakingPoint();
    return (
        <>
            <div>
                <Header size='text-2xl lg:text-5xl'>SketchSync</Header>
            </div>
            <div className="flex text-xl flex-wrap w-full lg:flex-col lg:space-x-0 lg:border-2
         lg:p-2  justify-center lg:border-black lg:rounded-md space-x-4">
                <h2>Round :- {round}</h2>
                {breakPoint !== "sm" && breakPoint !== "md" && (
                    <h2>Drawer :- {drawer ? drawer.name : ""}</h2>
                )}
                <Timer
                    start={setting.round_time}
                    onTimerEnd={onTimerEnd}
                    stop={!roundStart}
                    reset={!roundStart}
                />
                {!myChance && !choosing && <h2> Word :- {Array(wordLength || 4).fill("_").join(" ")}</h2>}
            </div>
            <div className={`w-full ${isSmall(breakPoint) || isMedium(breakPoint) || isLarge(breakPoint) ? "hidden" : "visible"} `}>
                <LeaderBoard />
            </div>

            {(isSmall(breakPoint) || isMedium(breakPoint) || isLarge(breakPoint)) &&
                <div>
                    {options.map((op, index) => {
                        return (
                            <div key={index}
                                className={`${currentOption === index && " text-2xl  bg-gray-200"} text-center border h-full w-full cursor-pointer ${index === 0 ? "rounded-t-full" : index === options.length - 1 ? "rounded-b-full" : ""} border-black`}
                                style={{
                                    textOrientation: "sideways",
                                    writingMode: "vertical-lr",
                                }}
                            >
                                <h2 onClick={()=>{handleOption(index)}}>{op}</h2>
                            </div>
                        )
                    })}
                </div>
            }

        </>
    )
}

export default observer(GameInfoArea);