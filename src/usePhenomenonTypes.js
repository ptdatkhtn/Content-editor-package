import { useState, useEffect } from "react"
import drupalApi from "@sangre-fp/connectors/drupal-api"
import { keyBy, sortBy } from "lodash-es"

// This is definitely not the best way to do this ... fix when you think of a better way
const sortedTypes = types => {
  if (types.length) {
    types[1].order = 1
    types[3].order = 4
    types[0].order = 6
    types[4].order = 5
    types[5].order = 3
    types[2].order = 2

    return sortBy(types, 'order')
  }

  return types
}

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
    phenomenonTypes: sortedTypes(phenomenonTypes),
    phenomenonTypesById: keyBy(phenomenonTypes, "id"),
    loading,
    error
  }
}

export const PhenomenonTypeLoader = ({ children }) => {
  const loader = usePhenomenonTypes()

  return children(loader)
}
