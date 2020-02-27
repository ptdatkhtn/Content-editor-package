import React, { Fragment, useState } from 'react'
import {
  requestTranslation,
  getAvailableLanguages,
  getLanguage
} from '@sangre-fp/i18n'
import { Formik } from 'formik'
import { map, differenceBy, find } from 'lodash-es'
import Select from 'react-select'
import styled from 'styled-components'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import PhenomenaSelector from './PhenomenaSelector'
import PhenomenaTimingEditor from './PhenomenaTimingEditor'
import {
  paddingModalStyles,
  Input,
  Modal,
  SelectImageContainer,
  SelectImageButton,
  SelectImageInput,
  SelectImageInputContainer,
  PhenomenonType,
  Radiobox,
  quillFormats,
  quillModules
} from '@sangre-fp/ui'
import PropTypes from 'prop-types'
import ReactQuill from 'react-quill'

import { usePhenomenonTypes } from './usePhenomenonTypes'
import { useEditableGroups } from './useGroups'
import { useFeedTags } from './useFeedTags'

const makeGetValue = phenomenon => (field, defaultValue = null) =>
  (phenomenon && phenomenon[field]) ?? defaultValue

const getType = type =>
  type && {
    id: type.id,
    title: type.title,
    issue_state: type.issue_state
  }

const SortableRelatedPhenomena = SortableElement(
  ({ relatedPhenom, onSelect }) => {
    const { title } = relatedPhenom

    return (
      <li
        className="d-flex align-items-center hoverable pt-1 pb-1 bg-white pl-1 pr-1"
        style={{ zIndex: 999, marginBottom: "1px" }}
      >
        <i className="material-icons mr-1" style={{ color: "#666" }}>
          swap_vert
        </i>
        <p className="mb-0">{title}</p>
        <button
          onClick={e => {
            e.preventDefault()
            onSelect(relatedPhenom)
          }}
          className="ml-auto material-icons"
          style={{ color: "#006998", flexShrink: 0 }}
        >
          cancel
        </button>
      </li>
    )
  }
)

const SortableRelatedPhenomenaList = SortableContainer(
  ({ relatedPhenomena, onSelect }) => {
    return (
      <ul className="pl-0" style={{ listStyleType: "none" }}>
        {relatedPhenomena.map((relatedPhenom, index) => (
          <SortableRelatedPhenomena
            index={index}
            key={`related-${index}`}
            relatedPhenom={relatedPhenom}
            onSelect={onSelect}
          />
        ))}
      </ul>
    )
  }
)

export const PhenomenonEditForm = ({
  phenomenon,
  // force radar context // TODO figure something out for this
  radar,
  onCancel,
  onSubmit,
  onDelete
}) => {
  const {
    phenomenonTypes,
    loading: loadingPhenomenonTypes,
    error: errorPhenomenonTypes
  } = usePhenomenonTypes()

  const {
    groups,
    loading: loadingGroups,
    error: errorGroups,
    canEditPublic
  } = useEditableGroups()

  const {
    feedTags,
    loading: loadingFeedTags,
    error: errorFeedTags
  } = useFeedTags()

  const getValue = makeGetValue(phenomenon)
  const [deletingModalOpen, setDeletingModalOpen] = useState(false)

  const loading = loadingFeedTags || loadingPhenomenonTypes || loadingGroups
  const error = errorFeedTags || errorPhenomenonTypes || errorGroups

  if (loading) {
    return <div className="py-5 text-center">Loading...</div>
  }

  if (error) {
    return <div className="py-5 text-center text-danger">{error.message}</div>
  }

  const initialState = getValue("state", phenomenonTypes[0])
  const initialType = find(
    phenomenonTypes,
    type => type.id === initialState.id
  )

  return (
    <Formik
      initialValues={{
        uuid: getValue("uuid"),
        language: getValue("language", radar ? radar.language : getLanguage()),
        group: radar ? radar.groupId : getValue("group"),
        title: getValue("title", ""),
        shortTitle: getValue("shortTitle", ""),
        lead: getValue("lead", ""),
        state: initialType || phenomenonTypes[0],
        video: getValue("videoUrl", ""),
        image: null,
        imageUrl: getValue("imageUrl"),
        imageFile: null,
        videoText: getValue("mediaText", ""),
        body: getValue("body", ""),
        relatedPhenomena: getValue("relatedPhenomena", []),
        newsFeeds: getValue("newsFeeds", []),
        newsFeedInput: "",
        feedTag: getValue("feedTag", []),
        timing: getValue("timing", { min: new Date().getFullYear() + 3, max: new Date().getFullYear() + 8 })
      }}
      validate={values => {
        const errors = {}

        if (!values.language) {
          errors.language = requestTranslation("fieldMissing")
        }

        if (values.group === null) {
          errors.group = requestTranslation("fieldMissing")
        }

        if (!values.title) {
          errors.title = requestTranslation("fieldMissing")
        }

        if (
          values.newsFeedInput.length &&
          !/^((https):\/\/)/.test(values.newsFeedInput)
        ) {
          errors.newsFeedInput = requestTranslation("newsFeedError")
        }

        return errors
      }}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          const originalNewsFeeds = getValue("newsFeeds", [])
          const addedNewsFeeds = differenceBy(
            values.newsFeeds,
            originalNewsFeeds
          )
          const deletedNewsFeeds = differenceBy(
            originalNewsFeeds,
            values.newsFeeds
          )

          const phenomenonInput = {
            ...values,
            relatedPhenomena: map(
              values.relatedPhenomena,
              ({ uuid, title }) => ({ uuid, title })
            )
          }

          await onSubmit(phenomenonInput, { addedNewsFeeds, deletedNewsFeeds })
        } catch (error) {
          alert(error.message)
        }

        setSubmitting(false)
      }}
    >
      {({
        values,
        setFieldValue,
        setFieldTouched,
        touched,
        errors,
        handleChange,
        handleBlur,
        handleSubmit,
        isSubmitting,
        isValid
      }) => {
        const addNewsFeed = () => {
          if (!errors.newsFeedInput) {
            setFieldValue("newsFeeds", [
              ...values.newsFeeds,
              { title: values.newsFeedInput }
            ])
            setFieldValue("newsFeedInput", "")
          }
        }

        const setState = ({
          target: {
            previousSibling: { value }
          }
        }) => {
          setFieldValue(
            "state",
            getType(find(phenomenonTypes, t => t.id === value))
          )
        }

        const toggleRelatedPhenomenon = phenomenon => {
          const exists = values.relatedPhenomena.find(
            relatedPhenomenon => phenomenon.uuid === relatedPhenomenon.uuid
          )
          setFieldValue(
            "relatedPhenomena",
            exists
              ? values.relatedPhenomena.filter(
                  relatedPhenomenon =>
                    phenomenon.uuid !== relatedPhenomenon.uuid
                )
              : values.relatedPhenomena.concat([phenomenon])
          )
        }

        const setRelatedPhenomenaSort = ({ newIndex, oldIndex }) => {
          const ordered = values.relatedPhenomena.slice()
          ordered.splice(newIndex, 0, ordered.splice(oldIndex, 1)[0])
          setFieldValue("relatedPhenomena", ordered)
        }

        const removeNewsFeed = newsFeed => {
          setFieldValue(
            "newsFeeds",
            values.newsFeeds.filter(({ title }) => title !== newsFeed.title)
          )
        }

        const handleImageSelect = (e, file) => {
          const fileName = file || e.target.files[0]
          const reader = new FileReader()

          reader.onload = () => {
            let img = new Image()
            img.src = URL.createObjectURL(fileName)

            img.onload = () => {
              setFieldValue("image", reader.result)
              setFieldValue("imageFile", fileName)
            }
          }

          reader.readAsDataURL(fileName)
        }

        const group = groups.find(group => group.id === values.group)

        if (values.uuid && !group) {
          return (
            <div className="text-center text-danger py-5">
              You do not have the permission to ${values.uuid ? 'edit this' : 'add a'} phenomenon.
            </div>
          )
        }

        return (
          <div>
            <div className="modal-form-sections">
              <div className="modal-form-section modal-form-header">
                <h2>{requestTranslation("createPhenomenaFormTitle")}</h2>
              </div>

              <div className="modal-form-section">
                <h3>
                  {requestTranslation("createPhenomenaFormLanguageLabel")}
                </h3>
                <p>
                  {requestTranslation("createPhenomenaFormLanguageDescription")}
                </p>
                {!values.uuid && (
                  <div className="form-group">
                    <h4>{requestTranslation("language")}</h4>
                    <div className="row">
                      <div className="col-6">
                        <Select
                          name="language"
                          className="fp-radar-select fp-radar-select--no-margin"
                          value={values.language}
                          onChange={({ value }) => {
                            setFieldValue("language", value)
                            setFieldValue("relatedPhenomena", [])
                          }}
                          options={getAvailableLanguages()}
                          searchable={false}
                          clearable={false}
                        />
                        {touched.language && errors.language && (
                          <div className="description text-danger">
                            {errors.language}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {!radar && !values.uuid && (
                  <div className="form-group">
                    <h4>{requestTranslation("group")}</h4>
                    <div className="row">
                      <div className="col-6">
                        <Select
                          name="group"
                          className="fp-radar-select fp-radar-select--no-margin"
                          value={values.group}
                          valueKey="id"
                          onBlur={() => setFieldTouched("group")}
                          onChange={group => {
                            setFieldValue("group", group ? group.id : null)
                          }}
                          options={groups}
                          searchable={false}
                          clearable={false}
                        />
                        {touched.group && errors.group && (
                          <div className="description text-danger">
                            {errors.group}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-form-section">
                <h3>
                  {requestTranslation("createPhenomenaFormTitleAndLeadLabel")}
                </h3>
                <p>
                  {requestTranslation(
                    "createPhenomenaFormTitleAndLeadDescription"
                  )}
                </p>
                <div className="row">
                  <div className="col-6">
                    <div className="form-group">
                      <h4>
                        {requestTranslation("createPhenomenaFormTitleLabel")}
                      </h4>
                      <Input
                        type="text"
                        name="title"
                        value={values.title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.title && errors.title && (
                        <div className="description text-danger">
                          {errors.title}
                        </div>
                      )}
                      <p className={"description"}>
                        {requestTranslation(
                          "createPhenomenaFormTitleDescription"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group">
                      <h4>
                        {requestTranslation(
                          "createPhenomenaFormShortTitleLabel"
                        )}
                      </h4>
                      <Input
                        type="text"
                        name="shortTitle"
                        value={values.shortTitle}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <p className={"description"}>
                        {requestTranslation(
                          "createPhenomenaFormShortTitleDescription"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <h4>{requestTranslation("createPhenomenaFormLeadLabel")}</h4>
                  <ReactQuill
                    className="fp-wysiwyg"
                    style={{
                      height: "250px",
                      paddingBottom: "42px"
                    }}
                    modules={quillModules}
                    formats={quillFormats}
                    value={values.lead}
                    onChange={value => setFieldValue("lead", value)}
                    onBlur={() => setFieldTouched("lead")}
                  />
                </div>
              </div>

              <div className="modal-form-section">
                <h3>{requestTranslation("createPhenomenaFormTypeLabel")}</h3>
                {map(phenomenonTypes, phenomenonType => (
                  <StateContainer key={phenomenonType.id}>
                    <PhenomenaState>
                      <PhenomenonType type={phenomenonType.alias} size={15} />
                    </PhenomenaState>
                    <Radiobox
                      name="type"
                      label={requestTranslation(phenomenonType.alias)}
                      value={phenomenonType.id}
                      checked={values.state.id === phenomenonType.id}
                      onClick={setState}
                      className='phenomena-radiobox'
                    />
                  </StateContainer>
                ))}
              </div>
              <div className="modal-form-section">
                <h3>{requestTranslation('timing')}</h3>
                <div>{requestTranslation('estimatedTimeRange')} <b>{values.timing.min}-{values.timing.max}</b></div>
                <PhenomenaTimingEditor
                  updateTiming={value => setFieldValue("timing", value)}
                  timing={values.timing}
                />
              </div>
              <div className="modal-form-section">
                <h3>{requestTranslation("media")}</h3>
                <div className="form-group">
                  <h4>{requestTranslation("video")}</h4>
                  <Input
                    name="video"
                    type="text"
                    value={values.video}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <p className={"description"}>
                    {requestTranslation("videoFormatsText")}
                  </p>
                  <p className={"description"}>
                    {requestTranslation("youtubeFormat")}
                    <br />
                    {requestTranslation("vimeoFormat")}
                  </p>
                </div>
                <div className="form-group">
                  <h4>{requestTranslation("image")}</h4>
                  <SelectImageContainer>
                    {!values.imageUrl &&
                      !values.image &&
                      requestTranslation("noImageSelected")}
                    {(values.imageUrl || values.image) && (
                      <div
                        className="position-relative w-100"
                        style={{ backgroundColor: "rgba(0,0,0, 0.1)" }}
                      >
                        <img
                          alt=""
                          className="img-fluid"
                          src={values.image || values.imageUrl}
                        />
                        <RadarImageCloseContainer
                          onClick={() => {
                            setFieldValue("image", null)
                            setFieldValue("imageFile", null)
                            setFieldValue("imageUrl", null)
                          }}
                        >
                          <RadarImageClose className="material-icons">
                            close
                          </RadarImageClose>
                        </RadarImageCloseContainer>
                      </div>
                    )}
                    <SelectImageInputContainer>
                      <SelectImageInput
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        placeholder={requestTranslation("select")}
                      />
                      <SelectImageButton className="btn btn-sm btn-outline-secondary">
                        {requestTranslation("select")}
                      </SelectImageButton>
                    </SelectImageInputContainer>
                  </SelectImageContainer>
                  <p className={"description"}>
                    {requestTranslation("imageUploadDescription")}
                  </p>
                </div>
                <div className="form-group">
                  <h4>{requestTranslation("createPhenomenaFormVideoLabel")}</h4>
                  <Input
                    type={"text"}
                    name="videoText"
                    value={values.videoText}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <p className={"description"}>
                    {requestTranslation("createPhenomenaFormVideoDescription")}
                  </p>
                </div>
              </div>

              <div className="modal-form-section">
                <h3>
                  {requestTranslation("createPhenomenaFormMainContentLabel")}
                </h3>
                <div className="form-group">
                  <ReactQuill
                    className="fp-wysiwyg"
                    style={{
                      height: "250px",
                      paddingBottom: "42px"
                    }}
                    modules={quillModules}
                    formats={quillFormats}
                    value={values.body}
                    onChange={value => setFieldValue("body", value)}
                    onBlur={() => setFieldTouched("body")}
                  />
                </div>
              </div>

              <div className="modal-form-section">
                <div style={{ overflow: "hidden" }} className="row">
                  <div className="col-12 col-md-4">
                    <h3>{requestTranslation("relatedPhenomena")}</h3>
                    {values.relatedPhenomena.length > 0 && (
                      <SortableRelatedPhenomenaList
                        relatedPhenomena={values.relatedPhenomena}
                        onSelect={toggleRelatedPhenomenon}
                        onSortEnd={setRelatedPhenomenaSort}
                      />
                    )}
                    <p className={"description"}>
                      {requestTranslation("relatedPhenomenaText")}
                    </p>
                  </div>
                  <div className="col-12 col-md-8" style={{ padding: 0 }}>
                    <RelatedPhenomena>
                      <PhenomenaSelector
                        small
                        phenomena={values.uuid ? [phenomenon] : []}
                        listView={!radar}
                        selectedPhenomena={values.relatedPhenomena}
                        language={values.language}
                        radarId={radar && radar.id}
                        onSelect={toggleRelatedPhenomenon}
                        filter={false}
                        group={values.group}
                      />
                    </RelatedPhenomena>
                  </div>
                </div>
              </div>
              {values.group !== 0 && (
                <div className="modal-form-section">
                  <h3>{requestTranslation("newsFeed")}</h3>
                  <p>{requestTranslation("feedDescription")}</p>
                  <h4 className={"mb-2"}>{requestTranslation("feedUrl")}</h4>
                  <div className="form-row align-items-center">
                    <div className="col-6 my-1">
                      <Input
                        className="mb-0"
                        name="newsFeedInput"
                        type={"text"}
                        value={values.newsFeedInput}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    <div className={"col-auto my-1"}>
                      <button
                        onClick={addNewsFeed}
                        disabled={!!errors.newsFeedInput}
                        className="btn btn-outline-secondary"
                      >
                        {requestTranslation("addFeed").toUpperCase()}
                      </button>
                    </div>
                    {touched.newsFeedInput && errors.newsFeedInput && (
                      <div className={"col-6"}>
                        <div className="invalid-feedback d-flex">
                          {errors.newsFeedInput}
                        </div>
                      </div>
                    )}
                  </div>
                  <h4 className={"mb-2"}>{requestTranslation("addedFeeds")}</h4>
                  {values.newsFeeds.length > 0 &&
                    map(values.newsFeeds, (newsFeed, index) => (
                      <div key={newsFeed.title + index} className="d-flex mb-1">
                        <DeleteRowButton
                          onClick={() => removeNewsFeed(newsFeed)}
                        >
                          <CloseIcon className="material-icons">
                            close
                          </CloseIcon>
                        </DeleteRowButton>
                        <p className="mb-0">{newsFeed.title}</p>
                      </div>
                    ))}
                  {values.newsFeeds.length === 0 && (
                    <p className="description">
                      {requestTranslation("noFeeds")}
                    </p>
                  )}
                </div>
              )}
              {canEditPublic && (
                <>
                  <div className="modal-form-section">
                    <h3>{requestTranslation("feed")}</h3>
                    <Select
                      name="feed"
                      value={values.feedTag}
                      labelKey="title"
                      valueKey="id"
                      onChange={value => setFieldValue("feedTag", value)}
                      options={feedTags}
                      multi={true}
                    />
                  </div>
                </>
              )}
            </div>

            <ButtonsContainer
              className={"modal-form-section modal-form-actions"}
            >
              {!radar && values.uuid && (
                <Fragment>
                  <button
                    className="btn btn-lg btn-plain-red"
                    onClick={() => setDeletingModalOpen(!deletingModalOpen)}
                    style={{
                      marginRight: "auto",
                      paddingLeft: 0
                    }}
                  >
                    {requestTranslation("delete")}
                  </button>
                  <Modal
                    isOpen={deletingModalOpen}
                    contentLabel="archive-sanity-check"
                    style={paddingModalStyles}
                    className={"paddedModal"}
                    ariaHideApp={false}
                  >
                    <div className={"confirmation-modal-content"}>
                      <h3 className={"confirmation-modal-title"}>
                        {requestTranslation("archiveDoubleCheck")}
                      </h3>
                      <div className={"confirmation-modal-actions"}>
                        <button
                          className="btn btn-lg btn-plain-gray"
                          onClick={() => setDeletingModalOpen(false)}
                        >
                          {requestTranslation("cancel")}
                        </button>
                        <button
                          className="btn btn-lg btn-primary"
                          onClick={onDelete}
                        >
                          {requestTranslation("delete")}
                        </button>
                      </div>
                    </div>
                  </Modal>
                </Fragment>
              )}
              <button className="btn btn-lg btn-plain-gray" onClick={onCancel}>
                {requestTranslation("cancel")}
              </button>
              <button
                className="btn btn-lg btn-primary"
                onClick={handleSubmit}
                type="submit"
                disabled={isSubmitting || !isValid}
              >
                {requestTranslation(values.uuid ? "update" : "create")}
              </button>
            </ButtonsContainer>
          </div>
        )
      }}
    </Formik>
  )
}

const Textarea = styled.textarea`
  font-size: 16px;
  min-height: 150px;
  border-radius: 1px;
`;

const StateContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  min-height: 25px;
  align-items: center;
`;

const PhenomenaState = styled.div`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    position: absolute;
    z-index: 10;
    left: 76px;
`

const RadarImageCloseContainer = styled.div`
  position: absolute;
  top: -15px;
  right: -15px;
  border-radius: 50%;
  background-color: #f1f3f3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid gray;
  &:hover {
    cursor: pointer;
  }
`;

const RadarImageClose = styled.i`
  /*color: gray;*/
  opacity: 0.7;
`;

const DeleteRowButton = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid red;
  color: red;
  font-size: 16px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
`;

const CloseIcon = styled.i`
  font-size: 14px;
  font-weight: 700;
  &:hover {
    cursor: pointer;
  }
`;

const RelatedPhenomena = styled.div`
  height: 300px;
  display: flex;
  flex-direction: column;
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

PhenomenonEditForm.propTypes = {
  phenomenon: PropTypes.object,
  radar: PropTypes.shape({
    id: PropTypes.string.isRequired,
    groupId: PropTypes.number.isRequired,
    language: PropTypes.string.isRequired
  }),
  onDelete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
}
