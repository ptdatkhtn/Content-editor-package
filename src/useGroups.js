import { useState, useEffect } from "react";
import drupalApi from "@sangre-fp/connectors/drupal-api";
import { filter, some } from "lodash-es";
import { requestTranslation } from "@sangre-fp/i18n";

const hasEditorRole = group => {
  const role = group.accountPermissions && group.accountPermissions.role;

  return role === "manager" || role === "owner" || role === "editor";
};

const hasPublicEditorRole = group =>
  group.accountDrupalRoles &&
  some(group.accountDrupalRoles[0], permission => permission === "fp editor");

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      setGroups(await drupalApi.getGroupsWithMemberShips());
    } catch (e) {
      setError(e);
    }

    setLoading(false);
  };

  useEffect(() => {
    handleFetch();
  }, []);

  return {
    groups,
    loading,
    error
  };
};

export const useEditableGroups = () => {
  const { groups, ...restUseGroups } = useGroups();

  const canEditPublic = some(groups, hasPublicEditorRole);
  const filteredGroups = filter(groups, hasEditorRole);
  const editableGroups = canEditPublic
    ? [{ id: 0, label: requestTranslation("public") }, ...filteredGroups]
    : filteredGroups;

  return {
    groups: editableGroups,
    canEditPublic,
    ...restUseGroups
  };
};

export const GroupsLoader = ({ children }) => {
  const loader = useGroups();

  return children(loader);
};

export const EditableGroupsLoader = ({ children }) => {
  const loader = useEditableGroups();

  return children(loader);
};
