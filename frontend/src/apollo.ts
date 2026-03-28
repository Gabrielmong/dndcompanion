import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { useAuthStore } from './store/auth'

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql',
})

// Decode JWT expiry without a library
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

let refreshPromise: Promise<void> | null = null

async function maybeRefreshToken() {
  const { token, setAuth } = useAuthStore.getState()
  if (!token) return

  const expiry = getTokenExpiry(token)
  if (!expiry) return

  // Refresh if less than 7 days remain
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (Date.now() < expiry - sevenDays) return

  // Deduplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = fetch(import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: 'mutation { refreshToken { token user { id email name } } }' }),
    })
      .then((r) => r.json())
      .then((json) => {
        const data = json?.data?.refreshToken
        if (data?.token) setAuth(data.user, data.token)
      })
      .catch(() => { /* silent — existing token still works */ })
      .finally(() => { refreshPromise = null })
  }
  await refreshPromise
}

const authLink = setContext(async (_, { headers }) => {
  await maybeRefreshToken()
  const token = useAuthStore.getState().token
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
  }
})

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
})

