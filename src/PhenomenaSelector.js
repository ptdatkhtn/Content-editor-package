import _ from "lodash"
import React, { PureComponent, Fragment } from "react"
import styled from "styled-components"
import Select from "react-select"
import { Radiobox } from "@sangre-fp/ui"
import { getAvailableLanguages, requestTranslation } from "@sangre-fp/i18n"
import { getPhenomena } from "@sangre-fp/connectors/search-api"
import statisticsApi from '@sangre-fp/connectors/statistics-api'
import { CreateButton, SearchInput } from "@sangre-fp/ui"
import { filter, map } from "lodash-es"
import { usePhenomenonTypes } from "./usePhenomenonTypes"

export const ALL_GROUP_VALUE = -1

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

export const radarLanguagesWithAll = () => [
  { value: "all", label: requestTranslation("all") },
  ...getAvailableLanguages()
]

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
      small,
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
        small={small}
        style={checked ? checkedStyle : null}
      >
        <PhenomenaRowContent onClick={this.handleClick}>
          <Radiobox
            large={!small}
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

class PhenomenaSelectorLegacy extends PureComponent {
  state = {
    textSearchValue: "",
    page: 0,
    loading: false,
    phenomenaList: [],
    totalPages: 0,
    language: _.find(radarLanguagesWithAll(), {
      value: this.props.language || "all"
    }),
    selectedGroupId: ALL_GROUP_VALUE
  }
  debounceTimeout = false

  handleLanguageChange = language => {
    this.setState(
      {
        language,
        page: 0,
        phenomenaList: [],
        totalPages: 0
      },
      this.fetchPhenomenaList
    )
  }

  handleGroupChange = selectedGroup =>
    this.setState(
      {
        selectedGroupId: selectedGroup.value,
        page: 0,
        phenomenaList: [],
        totalPages: 0
      },
      this.fetchPhenomenaList
    )

  handleScroll = e => {
    const { page, totalPages, loading } = this.state
    const bottom =
      e.target.scrollHeight - e.target.scrollTop - 25 < e.target.clientHeight

    if (bottom && !loading && page < totalPages) {
      this.setState({ page: page + 1 }, () => {
        this.fetchPhenomenaList()
      })
    }
  }

  handleTextSearchChange = ({ target }) =>
    this.setState(
      {
        textSearchValue: target.value,
        page: 0,
        phenomenaList: [],
        totalPages: 0
      },
      this.fetchPhenomenaList
    )

  componentDidMount() {
    this.fetchPhenomenaList()
  }

  /*
   * Detect group or language change on Phenomenon form and reset phenomena list accordingly
   */
  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.group, this.props.group)) {
      this.resetPhenomenaList()
    }

    if (!_.isEqual(prevProps.language, this.props.language)) {
      this.handleLanguageChange({ value: this.props.language })
    }
  }

  /*
   * This is in a separate function to avoid React error about invoking setState in componentDidUpdate,
   * which is only proper way to detect change in group prop and reset phenomena list
   */
  resetPhenomenaList = () => {
    this.setState(
      {
        page: 0,
        phenomenaList: [],
        totalPages: 0
      },
      this.fetchPhenomenaList
    )
  }

  matchPhenomenaWithStatistics = (phenomenonDocuments, statistics) => {
    const { phenomenaList } = this.state

      const newFilteredPhenomena = _.uniqBy([...phenomenonDocuments.filter(({ archived }) => !archived)], 'id')

      const newPhenomena = _.map(newFilteredPhenomena, phenomenonDoc => ({
        ...phenomenonDoc,
        crowdSourcedValue: statistics[phenomenonDoc.id] ?
            _.round(statistics[phenomenonDoc.id].year_median, 2) : null
      }))

      return _.uniqBy([...phenomenaList, ...newPhenomena], 'id')
  }


  fetchPhenomenaList = () => {
    const {
      phenomenaList,
      language: { value: language },
      selectedGroupId,
      textSearchValue,
      page
    } = this.state

    const { group } = this.props
    const groupId = (group && typeof group === 'object' && group.id) || group || 0
    const searchGroups = selectedGroupId === ALL_GROUP_VALUE || selectedGroupId === 0 ? [0] : []

    if (selectedGroupId === ALL_GROUP_VALUE && groupId) {
      searchGroups.push(groupId)
    } else if (selectedGroupId > 0) {
      searchGroups.push(selectedGroupId)
    }

    this.setState({ loading: true }, () => {
      getPhenomena({
        query: textSearchValue,
        groups: searchGroups,
        page,
        size: PAGE_SIZE,
        language,
        enhanced: true
      })
        .then(({ result, page: { totalPages } }) => {
          const uuidList = result ? result.map(({ id }) => id) : []

          if (uuidList.length) {
            statisticsApi.getPhenomenaStatistics(uuidList.join(','))
              .then(statisticsData => {
                  this.setState({
                    loading: false,
                    totalPages: totalPages,
                    phenomenaList: this.matchPhenomenaWithStatistics(result, statisticsData.data)
                  })
              })
              .catch(err => this.setState({ loading: false }))
          } else {
            this.setState({
              loading: false,
              phenomenaList: [],
              totalPages: data.page.totalPages
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
      small,
      listView,
      phenomenaTypesById,
      phenomena: excludedPhenomena
    } = this.props
    const { phenomenaList } = this.state

    const excludedPhenomenonUuids = map(excludedPhenomena, p => p.id)
    const filteredList = filter(
      phenomenaList,
      p => !excludedPhenomenonUuids.includes(p.id)
    )

    if (filteredList.length) {
      return filteredList.map(phenomenon => {
        const { id } = phenomenon

        return (
          <PhenomenonRow
            phenomenaTypesById={phenomenaTypesById}
            listView={listView}
            key={id}
            small={small}
            onSelect={this.props.onSelect}
            phenomenon={phenomenon}
            checked={this.isChecked(phenomenon)}
            radarId={radarId}
          />
        )
      })
    }

    return <p className="ml-4 mt-2 description">No Results found</p>
  }

  render() {
    const { onCreate, small, filter, group } = this.props
    const { textSearchValue, loading, language, selectedGroupId } = this.state
    const searchStyle = onCreate ? { marginRight: "0", marginTop: "0" } : null
    const groups = [
      { value: -1, label: requestTranslation("all") },
      { value: 0, label: requestTranslation("publicWord") }
    ]
    if (group) {
      groups.push({ value: group.id, label: group.title })
    }

    return (
      <Fragment>
        <SearchRow className={"phenomena-list-filters"}>
          {filter && (
            <h4 className={"language-filter-title"}>
              {requestTranslation("filterPhenomena")}
            </h4>
          )}
          <div className={"filter-col"}>
            <SearchInput
              type={"search"}
              small={small}
              className={"form-control-sm"}
              style={searchStyle}
              placeholder={requestTranslation("searchByKeywords")}
              value={textSearchValue}
              onChange={this.handleTextSearchChange}
            />
          </div>
          {filter && (
            <Fragment>
              <div className={"filter-col"}>
                <div key={"language-filter"} className={"language-filter"}>
                  <div>
                    <h5 className={"dropdown-filter-title"}>
                      {requestTranslation("group")}
                    </h5>
                    <Select
                      name="group"
                      className="fp-radar-select"
                      value={selectedGroupId}
                      onChange={this.handleGroupChange}
                      options={groups}
                      searchable={false}
                      clearable={false}
                    />
                  </div>
                </div>
              </div>
              <div className={"filter-col"}>
                <div key={"language-filter"} className={"language-filter"}>
                  <div>
                    <h5 className={"dropdown-filter-title"}>
                      {requestTranslation("language")}
                    </h5>
                    <Select
                      name="language"
                      className="fp-radar-select"
                      value={language.value}
                      onChange={this.handleLanguageChange}
                      options={radarLanguagesWithAll()}
                      searchable={false}
                      clearable={false}
                    />
                  </div>
                </div>
              </div>
            </Fragment>
          )}
          {onCreate && (
            <div className={"filter-col"}>
              <div className={"create-new-phenomenon-container"}>
                <SubTitle>{requestTranslation("createNewLabel")}</SubTitle>
                <CreateButton
                  onClick={onCreate}
                  className={"btn btn-outline-secondary"}
                >
                  {requestTranslation("createNew")}
                </CreateButton>
              </div>
            </div>
          )}
        </SearchRow>
        <SearchResultsList
          small={small}
          className={"public-phenomena-list"}
          onScroll={this.handleScroll}
        >
          {this.renderSearchResults()}
          {loading ? (
            <Loading
              className={"loading-overlay"}
              style={{
                height: !filter ? "300px" : "100%",
                top: !filter ? "0px" : "0px"
              }}
            >
              <label style={{ color: "white", fontSize: "1.4em" }}>
                Loading...
              </label>
            </Loading>
          ) : null}
        </SearchResultsList>
      </Fragment>
    )
  }
}

const PhenomenaSelector = props => {
  const { phenomenonTypesById, loading, error } = usePhenomenonTypes(props.group && props.group.id)

  if (loading) {
    return <div className="py-5">Loading...</div>
  }

  if (error) {
    return <div className="py-5">{error.message}</div>
  }

  return (
    <PhenomenaSelectorLegacy
      {...props}
      phenomenaTypesById={phenomenonTypesById}
    />
  )
}

export default PhenomenaSelector

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
  width: ${({ small }) => (small ? "100%" : "100%")};
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: 0;
  border: 1px solid #d5dbdf;
`;

const PhenomenaRowContent = styled.div`
  padding: 0 20px;
  height: 100%;
  display: flex;
  flex: 1 1 100%;
  cursor: pointer;
`;

const PhenomenaRowControls = styled.div`
  flex: 0;
  display: flex;
  padding: 0 20px;
  @media (max-width: 1100px) {
    padding: 0;
  }
`;

const PhenomenaRow = styled.div`
  display: flex;
  width: 100%;
  min-height: ${({ small }) => (small ? "45px" : "45px")};
  padding: 8px 0;
  box-sizing: border-box;
  align-items: center;
  border-bottom: 1px solid #d5dbdf;
`;

const ShowPhenomenonIcon = styled.span`
  font-size: 26px;
  display: inline-block;
  vertical-align: middle;
`;
