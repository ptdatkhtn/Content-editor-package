import React from 'react'
import { requestTranslation } from '@sangre-fp/i18n'
import styled from 'styled-components'

const PhenomenaLinks = ({ values, onChange }) => {
    const handleChange = (index, event) => {
      onChange(values.map((prevValue, i) =>
        i === index ? {...prevValue, value: event.target.value} : prevValue
      ))
    }
    const addMore = e => {
      e.preventDefault()
      e.stopPropagation()

      onChange([...values, { value: '' }])
    }
    const deleteClick = i => {
      const newValues = [...values]

      newValues.splice(i, 1)

      onChange(newValues)
    }

    const validateValues = () => {
      const regex = /^(ftp|http|https):\/\/[^ "]+$/

      let invalidFlag = false

      values.map(link => {
        if (!regex.test(link.value)) {
          invalidFlag = true
        }
      })

      return !values.length ? false : invalidFlag
    }

    const disabled = validateValues()

    return (
        <form>
            {values.map((linkVal, i) => (
                <div key={i} className='position-relative mb-2'>
                    <input
                      className='form-control form-control-lg'
                      type={'text'}
                      placeholder='https://'
                      value={linkVal.value || ''}
                      onChange={e => handleChange(i, e)}
                    />
                    <Close
                      className="btn-round btn-sm af-custom-close"
                      onClick={() => deleteClick(i)}
                    />
                </div>
            ))}
            {disabled && <p className='mt-1 mb-1'>{requestTranslation('linksError')}</p>}
            <button
              className="btn btn-lg btn-link d-block"
              disabled={disabled}
              onClick={addMore}
              type="button"
            >
              {requestTranslation("linksLabels")}
            </button>
        </form>
    )
}

export default PhenomenaLinks

const Close = styled.span`
  position: absolute;
  right: 12px;
  top: 16px;
`
