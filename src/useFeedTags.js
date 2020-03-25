import { useState, useEffect } from 'react'
import drupalApi from '@sangre-fp/connectors/drupal-api'

export const useFeedTags = () => {
  const [feedTags, setFeedTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)

    try {
      setFeedTags(await drupalApi.getRssFeedTags())
    } catch (e) {
      setError(e)
    }

    setLoading(false);
  }

  useEffect(() => {
    handleFetch()
  }, [])

  return {
    feedTags,
    loading,
    error
  };
};

export const FeedTagsLoader = ({ children }) => {
  const loader = useFeedTags()

  return children(loader)
};
