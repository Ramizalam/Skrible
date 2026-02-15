import React, { ChangeEventHandler, memo } from 'react'

interface Props{
    onchange: ChangeEventHandler<HTMLInputElement>
    value:string,
    className?:string
    placeholder?:string
}


const Input: React.FC<Props> = ({onchange,value,className,placeholder}) => {
  return (
    <input  onChange={onchange} value={value} placeholder={placeholder} className={`bg-transparent mx-1 h-full w-full focus:outline-none p-2 ${className}`} type="text" />
  )
}

export default  memo(Input);