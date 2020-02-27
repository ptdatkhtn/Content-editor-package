import _ from 'lodash'
import React, { Component, useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import { Range } from 'rc-slider'
import { requestTranslation } from '@sangre-fp/i18n'

const RANGE_MIN_YEAR = 0
const RANGE_MAX_YEAR = 100
const RANGE_VALUE_STEP = 25

const SHORT_TERM_START = 0
const SHORT_TERM_START_RANGE_VALUE = RANGE_MIN_YEAR
const MID_TERM_START = 3
const MID_TERM_START_RANGE_VALUE = SHORT_TERM_START_RANGE_VALUE + RANGE_VALUE_STEP
const LONG_TERM_START = 8
const LONG_TERM_START_RANGE_VALUE = MID_TERM_START_RANGE_VALUE + RANGE_VALUE_STEP
const LATER_TERM_START = 20
const LATER_TERM_START_RANGE_VALUE = LONG_TERM_START_RANGE_VALUE + RANGE_VALUE_STEP
const LATER_TERM_END = 100
const LATER_TERM_END_RANGE_VALUE =  RANGE_MAX_YEAR

export const RANGES = [
  {
    values: {
      min: SHORT_TERM_START,
      max: MID_TERM_START,
      rangeMin: SHORT_TERM_START_RANGE_VALUE,
      rangeMax: MID_TERM_START_RANGE_VALUE
    },
    label: requestTranslation('shortTerm'),
    step: RANGE_VALUE_STEP / (MID_TERM_START - SHORT_TERM_START),
    formula: value => _.round(0.12 * value),
    inverseFormula: year => _.round(8.33333 * year)
  },
  {
    values: {
      min: MID_TERM_START,
      max: LONG_TERM_START,
      rangeMin: MID_TERM_START_RANGE_VALUE,
      rangeMax: LONG_TERM_START_RANGE_VALUE
    },
    label: requestTranslation('midTerm'),
    step: RANGE_VALUE_STEP / (LONG_TERM_START - MID_TERM_START),
    formula: value => _.round(0.2 * value - 2),
    inverseFormula: year => _.round(-5 * (-year - 2))
  },
  {
    values: {
      min: LONG_TERM_START,
      max: LATER_TERM_START,
      rangeMin: LONG_TERM_START_RANGE_VALUE,
      rangeMax: LATER_TERM_START_RANGE_VALUE
    },
    label: requestTranslation('longTerm'),
    step: RANGE_VALUE_STEP / (LATER_TERM_START - LONG_TERM_START),
    formula: value => _.round(0.48 * value - 16),
    inverseFormula: year => _.round(-2.08333 * (-year - 16))
  },
  {
    values: {
      min: LATER_TERM_START,
      max: LATER_TERM_END,
      rangeMin: LATER_TERM_START_RANGE_VALUE,
      rangeMax: LATER_TERM_END_RANGE_VALUE
    },
    label: requestTranslation('laterTerm'),
    step: RANGE_VALUE_STEP / (LATER_TERM_END - LATER_TERM_START),
    formula: value => _.round(3.2 * value - 220),
    inverseFormula: year => _.round(-0.3125 * (-year - 220))
  }
]

export const getRangeValueFromYear = year => {
  const currentYear = new Date().getFullYear()
  const yearDiff = year - currentYear
  const inverseFormula = (_.find(RANGES, range => yearDiff < range.values.max) || RANGES[RANGES.length - 1]).inverseFormula

  return inverseFormula(yearDiff)
}

export default class PhenomenaTimingEditor extends Component {
  state = {
    values: [getRangeValueFromYear(this.props.timing.min), getRangeValueFromYear(this.props.timing.max)]
  }

  handleChange = values => {
    const { updateTiming } = this.props

    const currentYear = new Date().getFullYear()

    const firstRangeFormula = (_.find(RANGES, range => values[0] < range.values.rangeMax) || RANGES[RANGES.length - 1]).formula
    const firstYear = currentYear + firstRangeFormula(values[0])

    const secondRangeFormula = (_.find(RANGES, range => values[1] < range.values.rangeMax) || RANGES[RANGES.length - 1]).formula
    const secondYear = currentYear + secondRangeFormula(values[1])

    this.setState({ values }, () => updateTiming({ min: firstYear, max: secondYear }))
  }

  renderRangeButton = (range, index) => {
    const { label, values } = range
    const { min, max } = values

    return (
      <div className='d-flex flex-column align-items-center justify-content-center w-25 mt-2 mb-4' key={index}>
        <RailButton
          className='btn d-flex justify-content-center align-items-center w-100 mb-1'
          style={{
            borderTopLeftRadius: index === 0 ? '20px' : 0,
            borderBottomLeftRadius: index === 0 ? '20px' : 0,
            borderTopRightRadius: index === RANGES.length - 1 ? '20px' : 0,
            borderBottomRightRadius: index === RANGES.length - 1 ? '20px' : 0,
            borderRight: index === RANGES.length - 1 ? 'none' : '1px solid white'
          }}
          onClick={() => this.handleChange([ values.rangeMin, values.rangeMax ]) }
        >
          {label}
        </RailButton>
        <label>{min} - {max} {requestTranslation('years')}</label>
      </div>
    )
  }

  savePreviousValue = prevValues => this.setState({ prevValues })

  render() {
    const { values } = this.state

    return (
      <div>
        <Range
          className='timerange-rc-slider w-100 mt-4 mb-3'
          min={RANGE_MIN_YEAR}
          max={RANGE_MAX_YEAR}
          // allowCross={false}
          value={values}
          onBeforeChange={this.savePreviousValue}
          onChange={this.handleChange}
        />
        <div className='w-100 d-flex'>
          {_.map(RANGES, this.renderRangeButton)}
        </div>
        <RangeStyles />
      </div>
    )
  }
}

const RangeStyles = createGlobalStyle`
  .timerange-rc-slider {
    .rc-slider-handle {
      background-color: #00C3FF;
      border: 2px solid #00C3FF;
    }
    .rc-slider-track {
      background-color: #00C3FF;
    }
    .rc-slider-rail {
      background-color: #D8D8D8;
    }
  }
`

const RailButton = styled.button`
  background-color: #BBBBBB;
  border-radius: 0px;
  color: white;
  &:hover {
    background-color: #00C3FF;
  }
`
