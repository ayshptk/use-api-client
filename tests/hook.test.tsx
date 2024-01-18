import { renderHook } from "@testing-library/react-hooks";
import useApiClient from "../src";

test("useApiClient should handle initial state", () => {
  const { result } = renderHook(() =>
    useApiClient({
      baseUrl: "http://example.com",
    })({
      method: "GET",
      path: "/",
      config: {},
    })
  );

  const client = result.current;

  expect(client.response).toBeNull();
  expect(client.loading).toBe(false);
  expect(client.error).toBeNull();
});
