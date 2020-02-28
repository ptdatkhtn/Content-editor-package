import React, { Component } from 'react'
import { requestTranslation } from '@sangre-fp/i18n'


export default class PhenomenaLinks extends Component {
    state = { values: [{ value: null }] };

    handleChange(i, event) {
        let values = [...this.state.values];
        values[i].value = event.target.value;
        this.setState({ values });
    }

    addMore() {
        this.setState(prevState => ({
            values: [...prevState.values, { value: null }]
        }));
    }

    deleteClick(i) {
        const values = [...this.state.values];
        values.splice(i, 1);
        this.setState({ values });
    }


    render() {
        return (
            <form>
                {this.state.values.map((linkVal, i) => (
                    <div key={i}>
                        <input className="form-control form-control-lg"
                               type={"text"}
                               name="linkToWeb"
                               placeholder="https://"
                               value={linkVal.value || ""}
                               onChange={e => this.handleChange(i, e)}
                        />
                        <span className="af-custom-close"
                              style={{
                                  color: '#006998',
                                  position: 'relative',
                                  display: 'inline-block',
                                  left: '101%',
                                  bottom: '2.5rem'}}
                              onClick={() => this.deleteClick(i)}
                        />
                    </div>
                ))}

                <input className="btn btn-plain"
                       style={{
                           position: 'relative',
                           display: 'inline-block'
                       }}
                       type="button"
                       value={requestTranslation ("LinksLabels")}
                       onClick={() => this.addMore()} />
            </form>
        );
    }
}
