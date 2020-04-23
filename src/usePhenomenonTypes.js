import { useState, useEffect } from "react"
import drupalApi from "@sangre-fp/connectors/drupal-api"
import { keyBy, sortBy, times } from "lodash-es"

const sortedTypes = types => {
  if (types.length) {
    const customTypes = [...types]
    const defaultTypes = types.slice(Math.max(types.length - 6, 0))

    defaultTypes[1].order = 1
    defaultTypes[3].order = 4
    defaultTypes[0].order = 6
    defaultTypes[4].order = 5
    defaultTypes[5].order = 3
    defaultTypes[2].order = 2

    const sortedTypes = sortBy(defaultTypes, 'order')
    customTypes.splice(customTypes.length - 6)

    return [...customTypes, ...sortedTypes]
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
