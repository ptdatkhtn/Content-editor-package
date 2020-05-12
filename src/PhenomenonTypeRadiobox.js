import React from 'react'
import {
  PhenomenonType,
  Radiobox
} from '@sangre-fp/ui'
import styled from 'styled-components'

export default function PhenomenonTypeRadiobox ({ id, type, checked, name, label, style, onClick }) {

  return (
    <StateContainer key={id}>
      <PhenomenaState>
        <PhenomenonType type={type} size={15} fill={style ? style.color : null}/>
      </PhenomenaState>
      <Radiobox
        name={name}
        label={label}
        value={id}
        checked={checked}
        onClick={onClick}
        className='phenomena-radiobox'
      />
    </StateContainer>
  )
}

const StateContainer = styled.div`
    display: flex;
    box-sizing: border-box;
    min-height: 25px;
    align-items: center;
    width: 33.3%;
    position: relative;
`

const PhenomenaState = styled.div`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    position: absolute;
    z-index: 10;
    left: 26px;
`