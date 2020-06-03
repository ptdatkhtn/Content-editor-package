import _ from "lodash"
import React, { PureComponent, Fragment } from "react"
import styled from "styled-components"
import Select from "react-select"
import { radarLanguagesWithAll, requestTranslation } from "@sangre-fp/i18n"
import { getPhenomena } from '@sangre-fp/connectors/search-api'
import statisticsApi from '@sangre-fp/connectors/statistics-api'
import ContentFilters from '@sangre-fp/content-filters'
import {
  Radiobox,
  CreateButton,
  SearchInput,
  PhenomenonType,
  Search,
  OptionDropdown
} from '@sangre-fp/ui'
import { filter, map } from 'lodash-es'
import { usePhenomenonTypes } from './usePhenomenonTypes'

export const PUBLIC_GROUP_VALUE = 0
export const ALL_GROUP_VALUE = -1

function difference(object, base) {
  function changes(object, base) {
    return _.transform(object, function(result, value, key) {
      if (!_.isEqual(value, base[key])) {
        result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value
      }
    })
  }

  return changes(object, base)
}

const getPhenomenonUrl = (radarId = false, phenomenon, hideEdit = false) => {
  const { group, id } = phenomenon
  const hasGroup = phenomenon.hasOwnProperty("group")
  const groupUrl = hasGroup ? `group=${group}` : ""

  if (!radarId) {
    return `${process.env.REACT_APP_PUBLIC_URL}/fp-phenomena/${id}${
      groupUrl.length ? `/?${groupUrl}` : ""
    }`
  }

  // eslint-disable-next-line
  return `${
    process.env.REACT_APP_PUBLIC_URL
  }/node/${radarId}?issue=${id}&map_id=${radarId}&source_position=right&source_page=radar-view${
    groupUrl.length ? `&${groupUrl}` : ""
  }${hideEdit ? "&hideEdit=true" : ""}`
}

const checkedStyle = { backgroundColor: "rgb(241, 244, 246)" }
const PAGE_SIZE = 25

class PhenomenonRow extends PureComponent {
  handleClick = () => {
    const { phenomenon, onSelect } = this.props
    onSelect(phenomenon)
  }

  render() {
    const {
      phenomenon,
      checked,
      radarId,
      listView,
      phenomenaTypesById
    } = this.props
    let { content: { title, short_title, type, halo = false, id, time_range }, crowdSourcedValue } = phenomenon
    if (!time_range) {
      time_range = {}
    }
    const href = getPhenomenonUrl(listView ? false : radarId, phenomenon, true)
    const phenomenonType = phenomenaTypesById[type]
      ? phenomenaTypesById[type].alias || phenomenaTypesById[type]
      : "undefined"

    return (
      <PhenomenaRow
        className={"public-phenomena-row"}
        style={checked ? checkedStyle : null}
      >
        <PhenomenaRowContent onClick={this.handleClick}>
          <Radiobox
            className={"align-self-center"}
            label={short_title || title}
            value={id}
            checked={checked}
            phenomenaState={{ halo, type: phenomenonType }}
          />
            <div className='d-flex flex-column ml-auto' style={{ width: '30%' }}>
              <div>{time_range.min}-{time_range.max}</div>
              <div style={{ fontSize: '11px' }}>{requestTranslation('crowdSourced')} {crowdSourcedValue ? crowdSourcedValue : '-'}</div>
            <div/>
          </div>
        </PhenomenaRowContent>
        <PhenomenaRowControls>
          <button
            className={"btn btn-plain ml-auto align-self-center left"}
            data-href={href}
            title={requestTranslation("preview")}
          >
            <ShowPhenomenonIcon className="material-icons">
              remove_red_eye
            </ShowPhenomenonIcon>
          </button>
        </PhenomenaRowControls>
      </PhenomenaRow>
    )
  }
}

class SandboxPhenomenonRow extends PureComponent {
  render() {
    const {
      phenomenon,
      checked,
      radarId,
      listView,
      phenomenaTypesById,
      onAddToRadarClick
    } = this.props
    let { content: { title, short_title, type, halo = false, id, time_range }, crowdSourcedValue } = phenomenon
    if (!time_range) {
      time_range = {}
    }
    const href = getPhenomenonUrl(listView ? false : radarId, phenomenon, true)
    const phenomenonType = phenomenaTypesById[type]
      ? phenomenaTypesById[type].alias || phenomenaTypesById[type]
      : "undefined"

    return (
      <PhenomenaRow className={"public-phenomena-row"}>
        <PhenomenaRowContent
          className='d-flex align-items-center right hoverable'
          data-href={href}
        >
            <PhenomenonType
                halo={halo}
                type={phenomenonType}
                size={16}
                fill={phenomenonType.style ? phenomenonType.style.color : null}
            />
            <div className='ml-2'>
              {short_title || title}
            </div>
        </PhenomenaRowContent>
        <PhenomenaRowControls>
          <AddToRadarButton
            className='btn btn-outline-secondary ml-auto d-flex align-items-center justify-content-center p-0 mr-2'
            onClick={() => onAddToRadarClick(phenomenon)}
          >
            {requestTranslation('add')}
          </AddToRadarButton>
        </PhenomenaRowControls>
      </PhenomenaRow>
    )
  }
}

class PhenomenaSelectorLegacy extends PureComponent {
  state = {
    textSearchValue: '',
    page: 0,
    loading: false,
    phenomenaList: [],
    totalPages: 0,
    filtersShown: false,
    previousFilters: {},
    filtersActive: false
  }

  handleScroll = e => {
    const { page, totalPages, loading } = this.state
    const bottom = e.target.scrollHeight - e.target.scrollTop - 25 < e.target.clientHeight

    if (bottom && !loading && page < totalPages) {
      this.setState({ page: page + 1 })
    }
  }

  handleTextSearchChange = ({ target }) =>
    this.setState({
      textSearchValue: target.value,
      page: 0,
      phenomenaList: [],
      totalPages: 0
    })

  handleTextSearchClear = () =>
    this.setState({
      textSearchValue: '',
      page: 0,
      phenomenaList: [],
      totalPages: 0
    })

  createGroups = () => {
    const { group } = this.props

    const groups = [
      { value: -1, label: requestTranslation("all") },
      { value: 0, label: requestTranslation("publicWord") }
    ]

    if (group) {
      groups.push({ value: group.id, label: group.title })
    }

    return groups
  }

  matchPhenomenaWithStatistics = (phenomenonDocuments, statistics) => {
    const { phenomenaList } = this.state

      const newFilteredPhenomena = _.uniqBy([...phenomenonDocuments.filter(({ archived }) => !archived)], 'id')

      const newPhenomena = _.map(newFilteredPhenomena, phenomenonDoc => ({
        ...phenomenonDoc,
        crowdSourcedValue: statistics[phenomenonDoc.id] ?
            _.round(statistics [phenomenonDoc.id].year_median, 2).toFixed(2) : null
      }))

      return _.uniqBy([...phenomenaList, ...newPhenomena], 'id')
  }

  fetchPhenomenaList = filters => {
    const {
      types,
      times,
      tags,
      language: languageObj,
      group: selectedGroup,
      page,
      search,
      filtersActive
    } = filters
    const { group } = this.props
    const groupId = (group && typeof group === 'object' && group.id) || group || 0

    const groups = selectedGroup.value === ALL_GROUP_VALUE || selectedGroup.value === PUBLIC_GROUP_VALUE ? [PUBLIC_GROUP_VALUE] : []

    if (selectedGroup.value === ALL_GROUP_VALUE && groupId) {
      groups.push(groupId)
    } else if (selectedGroup.value > 0) {
      groups.push(selectedGroup.value)
    }

    let language = _.get(languageObj, 'value', null)

    if (language === 'all') {
        language = null
    }

    let newState = {}

    if (difference(filters, this.state.previousFilters).page) {
      newState = { loading: true, previousFilters: filters, filtersActive }
    } else {
      newState = {
        loading: true,
        previousFilters: filters,
        totalPages: 0,
        phenomenaList: [],
        filtersActive
      }
    }

    this.setState(newState, () => {
      getPhenomena({
        query: search,
        groups,
        page,
        size: PAGE_SIZE,
        language,
        tags: tags.map(({ value }) => value),
        types: types.map(({ value }) => value),
        time_max: times.max,
        time_min:  !times.min || times.min <= (new Date()).getFullYear() ? null : times.min,
        enhanced: true
      })
        .then(({ result, page: { totalPages } }) => {
          const uuidList = result ? result.map(({ id }) => id) : []

          if (uuidList.length) {
            statisticsApi.getPhenomenaStatistics(uuidList.join(','))
              .then(statisticsData => {
                  const phenomenaList = this.matchPhenomenaWithStatistics(result, statisticsData.data)

                  this.setState({
                    loading: false,
                    phenomenaList,
                    totalPages
                  })
              })
              .catch(err => this.setState({ loading: false }))
          } else {
            this.setState({
              loading: false,
              phenomenaList: [],
              totalPages: 0
            })
          }
        })
        .catch(() => this.setState({ loading: false }))
    })
  }

  isChecked({ id }) {
    const { selectedPhenomena } = this.props

    if (!selectedPhenomena) {
      return false
    }

    if (_.isArray(selectedPhenomena)) {
      return selectedPhenomena.length > 0 && _.find(selectedPhenomena,p => p.id === id)
    }
    return id === selectedPhenomena.id
  }

  renderSearchResults = () => {
    const {
      radarId,
      listView,
      phenomenaTypesById,
      phenomena: excludedPhenomena,
      onAddToRadarClick,
      sandbox,
      group
    } = this.props
    const { phenomenaList, loading } = this.state
    const excludedPhenomenonUuids = map(excludedPhenomena, p => p.id)
    const filteredList = filter(
      phenomenaList,
      p => !excludedPhenomenonUuids.includes(p.id)
    )

    return (
      <div className='pr-2'>
        {filteredList.map(phenomenon => {
          const { id } = phenomenon

          return sandbox ? (
            <SandboxPhenomenonRow
              phenomenaTypesById={phenomenaTypesById}
              listView={listView}
              key={id}
              onSelect={this.props.onSelect}
              phenomenon={phenomenon}
              checked={this.isChecked(phenomenon)}
              radarId={radarId}
              onAddToRadarClick={onAddToRadarClick}
            />
          ) : (
            <PhenomenonRow
              phenomenaTypesById={phenomenaTypesById}
              listView={listView}
              key={id}
              onSelect={this.props.onSelect}
              phenomenon={phenomenon}
              checked={this.isChecked(phenomenon)}
              radarId={radarId}
            />
          )
        })}
        {loading && (
          <div className="py-2 pl-2">{requestTranslation('loading')}</div>
        )}
        {!filteredList.length && !loading &&  (
          <p className="ml-4 mt-2 description">No Results found</p>
        )}
      </div>
    )
  }

  render() {
    const { onCreate, filter, group, sandbox } = this.props
    const {
      textSearchValue,
      loading,
      filtersShown,
      page,
      totalPages,
      previousFilters,
      filtersActive
    } = this.state

    return (
      <div
        className='d-flex w-100 flex-column'
        style={{ overflow: sandbox ? 'visible' : 'auto' }}
      >
        <div className='d-flex align-items-center w-100 mb-3'>
          {sandbox && (
            <FilterButton
              onClick={() => this.setState({ filtersShown: !filtersShown })}
              className={`btn-round d-flex align-items justify-content-center position-relative mr-3 ${filtersShown ? '' : 'inactive'}`}>
              {filtersActive && (
                <FiltersActiveTag className='d-flex align-items-center justify-content-center'>
                  <i className='material-icons'>
                    done
                  </i>
                </FiltersActiveTag>
              )}
              <i
                className='material-icons d-flex align-items-center justify-content-center'
                style={{
                  fontSize: '20px',
                  transform: 'rotate(-90deg)',
                  fontWeight: 'bold'
              }}>
                tune
              </i>
            </FilterButton>
          )}
          <Search
            className='mt-0 phenomena-list-search mb-0'
            value={textSearchValue}
            onChange={this.handleTextSearchChange}
            onClear={this.handleTextSearchClear}
          />
        </div>
        {filtersShown && (
          <div className='text-center mb-3'>
            {loading ? requestTranslation('loading') : `${totalPages} ${requestTranslation('resultsFound')}`}
          </div>
        )}
        <SearchResultsList
          onScroll={this.handleScroll}
          style={{ border: sandbox ? 'none' : '1px solid #E9ECEC' }}
        >
          <div
            className='h-100 pr-2'
            style={{ display: filtersShown ? 'block' : 'none'}}
          >
            <ContentFilters
              page={page}
              search={textSearchValue}
              passedGroups={this.createGroups()}
              onFilterChange={this.fetchPhenomenaList}
              countShown={false}
            />
            <button className='btn btn-primary w-100 mt-2' onClick={() => this.setState({ filtersShown: false })}>
              {requestTranslation('closeFilters')}
            </button>
          </div>
          {!filtersShown && this.renderSearchResults()}
        </SearchResultsList>
      </div>
    )
  }
}

const PhenomenaSelector = props => {
  const { group } = props

  const { phenomenonTypesById, loading, error } = usePhenomenonTypes(_.isObject(group) ? group.id : group)

  if (loading) {
    return <div className="pl-2 py-2">{requestTranslation('loading')}</div>
  }

  if (error) {
    return <div className="pl-2 py-2">{error.message}</div>
  }

  return (
    <PhenomenaSelectorLegacy
      {...props}
      phenomenaTypesById={phenomenonTypesById}
    />
  )
}

export default PhenomenaSelector

const FiltersActiveTag = styled.div`
  position: absolute;
  width: 15px;
  height: 15px;
  background-color: white;
  border-radius: 50%;
  top: -3px;
  left: -3px;
  i {
    font-size: 11.5px;
    color: #006998;
    font-weight: bold;
  }
`

const Loading = styled.div`
  width: 100%;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  left: 0;
  flex-direction: column;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: flex-start;
`;

const SubTitle = styled.h5`
  margin: 0 0 10px;
  position: relative;
  text-align: center;
`;

const SearchResultsList = styled.div`
  width: 100%;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: 0;
  /*background-color: white;*/
  border-right: 0;
  border-radius: 5px;
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background: #C8C8C9;
    border-radius: 20px;
  }

  ::-webkit-scrollbar-track {
    background: white;
    border-radius: 20px;
  }
`;

const PhenomenaRowContent = styled.div`
  padding: 0 10px;
  height: 100%;
  display: flex;
  flex: 1 1 100%;
  cursor: pointer;
`;

const PhenomenaRowControls = styled.div`
  flex: 0;
  display: flex;
  padding: 0 10px;
  @media (max-width: 1100px) {
    padding: 0;
  }
`;

const PhenomenaRow = styled.div`
  display: flex;
  width: 100%;
  min-height: 45px;
  padding: 8px 0;
  box-sizing: border-box;
  align-items: center;
  border-bottom: 1px solid #E9ECEC;
  background-color: white;
`;

const ShowPhenomenonIcon = styled.span`
  font-size: 26px;
  display: inline-block;
  vertical-align: middle;
`;

const FilterButton = styled.div`
  width: 38px !important;
  height: 38px !important;
  flex-shrink: 0;

  &.inactive {
    background-color: transparent !important;
    border: 1px solid #006998;

    i {
      color: #006998;
    }
  }
`

const AddToRadarButton = styled.button`
  height: 22px;
  width: 48px;
  font-size: 11px;
`