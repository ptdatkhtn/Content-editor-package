import React, {useCallback} from 'react'
import {requestTranslation} from '@sangre-fp/i18n'


const PhenomenaLinks = ({values, onChange}) => {

    const handleChange = useCallback((index, event) => {
        onChange(values.map((prevValue, i) =>
            i === index
                ? {...prevValue, value: event.target.value}
                : prevValue
        ))
    }, [values, onChange]);

    const addMore = useCallback(() => {
        onChange(
            [...values, {value: null}]
        );
    }, [values, onChange]);

    const deleteClick = useCallback((i) => {
        const newValues = [...values];
        newValues.splice(i, 1);
        onChange(newValues);
    }, [values, onChange]);


    return (
        <form>
            {values.map((linkVal, i) => (
                <div key={i}>
                    <input className="form-control form-control-lg"
                           type={"text"}
                           name="linkToWeb"
                           placeholder="https://"
                           value={linkVal.value || ""}
                           onChange={e => handleChange(i, e)}
                    />
                    <span className="btn-round btn-sm af-custom-close"
                          style={{
                              position: 'relative',
                              display: 'inline-block',
                              left: '101%',
                              bottom: '2.5rem'
                          }}
                          onClick={() => deleteClick(i)}
                    />
                </div>
            ))}

            <input className="btn btn-sm btn-plain"
                   style={{
                       position: 'relative',
                       display: 'inline-block'
                   }}
                   type="button"
                   value={requestTranslation("LinksLabels")}
                   onClick={addMore}/>
        </form>
    );
};

export default PhenomenaLinks;