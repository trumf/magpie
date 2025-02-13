// hooks/useFileNavigation.js
import {useMemo, useCallback} from "react";
import {useApp} from "../contexts/AppContext";
import NavigationService from "../services/NavigationService";

export const useFileNavigation = () => {
  const {files, currentFile, handleFileSelect} = useApp();

  const navigation = useMemo(
    () => NavigationService.getNavigationState(files, currentFile?.path),
    [files, currentFile]
  );

  const navigateNext = useCallback(() => {
    if (navigation.hasNext) {
      handleFileSelect(navigation.nextFile);
    }
  }, [navigation, handleFileSelect]);

  const navigatePrevious = useCallback(() => {
    if (navigation.hasPrevious) {
      handleFileSelect(navigation.previousFile);
    }
  }, [navigation, handleFileSelect]);

  return {
    ...navigation,
    navigateNext,
    navigatePrevious,
  };
};
