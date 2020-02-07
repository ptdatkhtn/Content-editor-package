import { useState, useEffect } from "react";
import drupalApi from "@sangre-fp/connectors/drupal-api";
import { keyBy } from "lodash-es";

export const usePhenomenonTypes = () => {
  const [phenomenonTypes, setPhenomenonTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      setPhenomenonTypes(await drupalApi.getPhenomenaTypes());
    } catch (e) {
      setError(e);
    }

    setLoading(false);
  };

  useEffect(() => {
    handleFetch();
  }, []);

  return {
    phenomenonTypes,
    phenomenonTypesById: keyBy(phenomenonTypes, "id"),
    loading,
    error
  };
};

export const PhenomenonTypeLoader = ({ children }) => {
  const loader = usePhenomenonTypes();

  return children(loader);
};

