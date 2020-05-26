import { useState, useEffect } from "react"
import drupalApi from "@sangre-fp/connectors/drupal-api"
import { keyBy, sortBy } from "lodash-es"

export const usePhenomenonTypes = groupId => {
  const [phenomenonTypes, setPhenomenonTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleFetch = async (groupId) => {
    setLoading(true)
    setError(null)

    try {
      setPhenomenonTypes(await drupalApi.getPhenomenaTypes(groupId))
    } catch (e) {
      setError(e)
    }

    setLoading(false)
  };

  useEffect(() => {
    handleFetch(groupId)
  }, [groupId])

  return {
    phenomenonTypes: phenomenonTypes,
    phenomenonTypesById: keyBy(phenomenonTypes, "id"),
    loading,
    error
  }
}

export const PhenomenonTypeLoader = ({ children }) => {
  const loader = usePhenomenonTypes()

  return children(loader)
}
