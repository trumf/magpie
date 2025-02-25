// Modified useFileNavigation.js
import {useMemo, useCallback, useRef} from "react";
import {useApp} from "../contexts/AppContext";
import NavigationService from "../services/NavigationService";

export const useFileNavigation = () => {
  const {files, currentFile, handleFileSelect} = useApp();
  // Reference to the content container
  const contentRef = useRef(null);

  const navigation = useMemo(
    () => NavigationService.getNavigationState(files, currentFile?.path),
    [files, currentFile]
  );

  // Wrapper for handleFileSelect that also resets scroll position
  const handleFileSelectWithScrollReset = useCallback(
    (file) => {
      handleFileSelect(file);
      // Reset scroll position after file selection
      if (contentRef.current) {
        setTimeout(() => {
          contentRef.current.scrollTo(0, 0);
        }, 0);
      }
    },
    [handleFileSelect]
  );

  const navigateNext = useCallback(() => {
    if (navigation.hasNext) {
      handleFileSelectWithScrollReset(navigation.nextFile);
    }
  }, [navigation, handleFileSelectWithScrollReset]);

  const navigatePrevious = useCallback(() => {
    if (navigation.hasPrevious) {
      handleFileSelectWithScrollReset(navigation.previousFile);
    }
  }, [navigation, handleFileSelectWithScrollReset]);

  return {
    ...navigation,
    navigateNext,
    navigatePrevious,
    contentRef,
  };
};
