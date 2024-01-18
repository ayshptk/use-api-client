# use-api-client

use-api-client is a custom React hook factory designed to create hooks for performing API calls with extensive configuration options. It leverages axios for HTTP requests and provides features like caching, retrying on failure, polling, progress tracking, and custom logging.

## Features

- **Configurable Base URL**: Set a base URL for all API calls.
- **Interceptors**: Add custom request and response interceptors.
- **Caching**: Cache API responses with a configurable TTL (Time To Live).
- **Retry Mechanism**: Automatically retry failed requests.
- **Polling**: Continuously poll an endpoint at a specified interval.
- **Progress Tracking**: Track the progress of upload and download requests.
- **Custom Logging**: Implement custom logging logic.

## Installation

To use `use-api-client` in your project, you need to have `axios` and `react` installed as they are peer dependencies.

```bash
npm install axios react
```

## Usage

To create an API client, call the useApiClientFactory with your configuration preferences.

```tsx
mport useApiClientFactory from 'use-api-client';

const apiClient = useApiClientFactory({
baseUrl: 'https://api.example.com',
// ...other preferences
});
```

You can then use the returned `apiClient` hook in your components to make API calls.

```tsx
const MyComponent = () => {
  const apiCall = apiClient({
    path: "/data",
    method: "GET",
    // ...other API call options
  });

  // Destructure the properties you need
  const { response, loading, error, fetch } = apiCall;

  // Fetch data on component mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Render your component based on the API call state
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{JSON.stringify(response)}</div>;
};
```

## Configuration

The useApiClientFactory accepts an IClientConfig object with the following options:

- baseUrl: The base URL for the API.
- onException: Callback for handling exceptions.
- defaultHeaders: Default headers for API requests.
- defaultQueryParams: Default query parameters for API requests.
- logging: Configuration for logging.
- retry: Configuration for retrying failed requests.
- progress: Configuration for tracking progress of requests.
- interceptors: Custom axios interceptors.

The `apiClient` hook returned by the factory accepts an IApiCall object with options such as path, method, body, headers, queryParams, refresh, ttl, and config.

## Testing

The package includes tests written with `@testing-library/react-hooks`. To run the tests, execute:

```bash
npm test
```

## Building

To build the package, run:

```bash
npm run build
```

This will transpile the TypeScript source code to JavaScript using Babel and output it to the dist directory.

## Continuous Integration

The .github/workflows/ci.yaml file defines a GitHub Actions workflow for continuous integration, which installs dependencies, sets up Node.js, and runs tests on push events.

## Contributing

Contributions are welcome. Please follow the existing code style and add tests for any new features or fixes.

## License

use-api-client is open-sourced software licensed under the MIT license.
