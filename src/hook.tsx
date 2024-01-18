// Importing necessary hooks and axios for making API requests
import { useState, useEffect, useMemo } from "react";
import axios, { AxiosRequestConfig } from "axios";

// Type for client factory configuration
type IClientConfig = {
  baseUrl: string; // Base URL for the API
  onException?: (error: any) => void; // Callback function for handling exceptions
  defaultHeaders?: any; // Default headers for the API requests
  defaultQueryParams?: any; // Default query parameters for the API requests
  logging?: {
    // Logging related configurations
    enableLogging?: boolean; // Flag to enable/disable logging
    logLevel?: "debug" | "info" | "warn" | "error"; // Log level for the logger
    logFunction?: (level: string, message: string) => void; // Function for logging
  };
  retry?: {
    // Retry related configurations
    enableRetry?: boolean; // Flag to enable/disable retry
    maxRetryCount?: number; // Maximum number of retries
    retryInterval?: number; // Interval between retries
    retryCondition?: (error: any) => boolean; // Condition for retrying
  };
  progress?: {
    // Progress related configurations
    progressMode?: "upload" | "download" | "both"; // Mode of progress (upload, download, or both)
    progressInterval?: number; // Interval for progress updates
    onUploadProgress?: (progressEvent: any) => void; // Callback function for upload progress
    onDownloadProgress?: (progressEvent: any) => void; // Callback function for download progress
  };
  interceptors?: {
    // Interceptors for the requests and responses
    request?: (config: any) => any; // Request interceptor
    response?: (response: any) => any; // Response interceptor
  };
};

// Type for API client configuration
type IApiCall = {
  path?: string; // Path for the API endpoint
  method?: "GET" | "POST" | "PUT" | "DELETE"; // HTTP method for the request
  body?: any; // Body of the request
  headers?: any; // Headers for the request
  queryParams?: any; // Query parameters for the request
  refresh?: number; // Refresh interval for the request
  ttl?: number; // Time to live for the cache
  config?: AxiosRequestConfig; // Axios request configuration
};

// Factory function for creating API clients
const useApiClientFactory = (preferences: IClientConfig) => {
  // Hook for handling API requests
  const hook = (config: IApiCall) => {
    // State variables for the hook
    const [response, setResponse] = useState<any>(null); // Response from the API
    const [loading, setLoading] = useState<boolean>(false); // Loading state for the request
    const [error, setError] = useState<any>(null); // Error state for the request
    const [source, setSource] = useState<any>(null); // Source for the axios request
    const [cache, setCache] = useState<any>(null); // Cache for the request
    const [cacheTime, setCacheTime] = useState<number>(0); // Cache time for the request
    const [intervalId, setIntervalId] = useState<any>(null); // Interval ID for the polling
    const [uploadProgress, setUploadProgress] = useState<number>(0); // Upload progress for the request
    const [downloadProgress, setDownloadProgress] = useState<number>(0); // Download progress for the request
    const [progress, setProgress] = useState<number>(0); // Overall progress for the request
    const [progressUpdateInterval, setProgressUpdateInterval] =
      useState<any>(null); // Interval for progress updates
    const [retryCount, setRetryCount] = useState<number>(0); // Retry count for the request

    const logger = (level: string, message: string) => {
      const { logging } = preferences;
      if (!logging?.enableLogging) return;

      const { logLevel, logFunction } = logging;
      let shouldLog = false;

      switch (logLevel) {
        case "debug":
          shouldLog = true;
          break;
        case "info":
          shouldLog = level === "info" || level === "warn" || level === "error";
          break;
        case "warn":
          shouldLog = level === "warn" || level === "error";
          break;
        case "error":
          shouldLog = level === "error";
          break;
        default:
          shouldLog = false;
          break;
      }

      if (!shouldLog) return;

      if (logFunction) {
        logFunction(level, message);
      } else {
        const logMessage = `[${level}] ${message}`;
        console.log(logMessage);
      }
    };

    // Function for updating the progress
    const updateProgress = (
      progressEvent: any,
      setProgress: (value: number) => void,
      callback?: (progressEvent: any) => void
    ) => {
      // If the total size is available, calculate the progress
      if (progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        // Update the progress
        setProgress(percentCompleted);
        // If a callback function is provided, call it with the progress event
        if (callback) {
          callback(progressEvent);
        }
      }
    };

    // Function for triggering a progress change
    const triggerProgressChange = () => {
      // If progress is enabled
      if (preferences.progress) {
        // Switch based on the progress mode
        switch (preferences.progress.progressMode) {
          case "upload":
            // If the mode is upload, set the progress to the upload progress
            setProgress(uploadProgress);
            break;
          case "download":
            // If the mode is download, set the progress to the download progress
            setProgress(downloadProgress);
            break;
          default:
            // If the mode is both, set the progress to the average of upload and download progress
            setProgress((uploadProgress + downloadProgress) / 2);
            break;
        }
      }
    };
    // Create an axios instance with the provided preferences
    const axiosInstance = useMemo(() => {
      const instance = axios.create();
      // If a request interceptor is provided, use it
      if (preferences.interceptors?.request) {
        instance.interceptors.request.use(preferences.interceptors.request);
      }
      // If a response interceptor is provided, use it
      if (preferences.interceptors?.response) {
        instance.interceptors.response.use(preferences.interceptors.response);
      }
      // Return the created instance
      return instance;
    }, [preferences]);

    // Function for making the API request
    const request = async () => {
      try {
        logger(
          "info",
          `Making request to ${preferences.baseUrl}${config.path}`
        );
        // Set the loading state to true
        setLoading(true);
        // Reset the error state
        setError(null);
        // Reset the progress states
        setProgress(0);
        setUploadProgress(0);
        setDownloadProgress(0);

        // If progress updates are enabled
        if (preferences.progress && preferences.progress.progressInterval) {
          // If a progress update interval is already set, clear it
          if (progressUpdateInterval) {
            clearInterval(progressUpdateInterval);
          }
          // Set a new progress update interval
          setProgressUpdateInterval(
            setInterval(() => {
              triggerProgressChange();
            }, preferences.progress.progressInterval || 100)
          );
        }

        // Create a cancel token for the request
        const CancelToken = axios.CancelToken;
        const source = CancelToken.source();
        // Set the source state
        setSource(source);

        // Initialize the response variable
        let response = null;
        // If the request has a TTL and the cache is valid, use the cache
        if (config.ttl && cache && cacheTime + config.ttl > Date.now()) {
          response = cache;
        } else {
          // Otherwise, make the API call
          try {
            response = await axiosInstance.request({
              url: `${preferences.baseUrl}${config.path}`,
              method: config.method,
              data: config.body,
              headers: {
                ...preferences.defaultHeaders,
                ...config.headers,
              },
              params: {
                ...preferences.defaultQueryParams,
                ...config.queryParams,
              },
              ...config.config,
              cancelToken: source.token,
              onUploadProgress: (progressEvent) => {
                // Update the upload progress
                updateProgress(
                  progressEvent,
                  setUploadProgress,
                  preferences.progress?.onUploadProgress
                );
              },
              onDownloadProgress: (progressEvent) =>
                // Update the download progress
                updateProgress(
                  progressEvent,
                  setDownloadProgress,
                  preferences.progress?.onDownloadProgress
                ),
            });
            logger(
              "info",
              `Request to ${preferences.baseUrl}${config.path} completed`
            );

            // If the request has a TTL, cache the response
            if (config.ttl) {
              setCache(response.data);
              setCacheTime(Date.now());
            }
            // Set the response state
            setResponse(response.data);
          } catch (error) {
            // If the error is not a cancellation, throw it
            if (!axios.isCancel(error)) {
              logger(
                "error",
                `Request to ${preferences.baseUrl}${config.path} failed`
              );
              // If retry is enabled and retry count is less than 3, retry the request
              if (
                preferences.retry?.enableRetry &&
                retryCount < (preferences.retry?.maxRetryCount || 3)
              ) {
                if (preferences.retry?.retryCondition) {
                  if (!preferences.retry?.retryCondition(error)) {
                    throw error;
                  } else {
                    setRetryCount(retryCount + 1);
                    setTimeout(() => {
                      request();
                    }, preferences.retry?.retryInterval || 1000);
                  }
                }
              } else {
                setRetryCount(0);
                throw error;
              }
            }
          } finally {
            // Reset the source state
            setSource(null);
          }
        }
      } catch (error) {
        // Set the error state
        setError(error);
        // If an exception handler is provided, call it with the error
        if (preferences.onException) {
          preferences.onException(error);
        }
      } finally {
        // Set the loading state to false
        setLoading(false);
        // If a progress update interval is set, clear it
        if (progressUpdateInterval) {
          clearInterval(progressUpdateInterval);
        }
      }
    };

    // Function for fetching the data
    const fetch = () => {
      request();
    };

    // Function for cancelling the request
    const cancel = () => {
      if (source) {
        source.cancel();
      }
    };

    // Function for starting the polling
    const startPolling = () => {
      if (config.refresh) {
        stopPolling();
        setIntervalId(
          setInterval(() => {
            request();
          }, config.refresh)
        );
      }
    };

    // Function for stopping the polling
    const stopPolling = () => {
      if (intervalId) {
        try {
          clearInterval(intervalId);
          setIntervalId(null);
        } catch (error) {}
      }
    };

    // Effect for handling the polling
    useEffect(() => {
      if (config.refresh) {
        startPolling();
      }
      return () => {
        stopPolling();
      };
    }, [config.refresh, fetch]);

    // Return the hook's API
    return {
      response,
      loading,
      error,
      fetch,
      cancel,
      polling: {
        resume: startPolling,
        pause: stopPolling,
      },
      progress,
    };
  };
  // Return the hook
  return hook;
};

// Export the factory function
export default useApiClientFactory;
