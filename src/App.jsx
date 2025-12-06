import { useState, useEffect} from 'react'
import Search from './components/Search'
import Spinner from './components/Spinner'
import MovieCard from './components/MovieCard'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './appwrite'

// defining a constant string that holds the base URL for the TMDB API.
const API_BASE_URL = 'https://api.themoviedb.org/3'

// This pulls your API key from your environment variables.
// import.meta.env = Vite’s way of exposing environment values
// VITE_TMDB_API_KEY = must start with VITE_ or Vite refuses to expose it
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

// This object defines default settings for fetch requests.
const API_OPTIONS = {
  // defining that every request using this options object will be a GET unless overwritten.
  method: 'GET',
  // attaching metadata to the request. Without this, TMDB won’t know:
  // what format you want responses in
  // who you are (your auth token)
  headers: {
    // explicitly telling the server: “Return everything in JSON format.”
    accept: 'application/json',
    // authenticating yourself using a Bearer token
    Authorization: `Bearer ${API_KEY}`,
  },
}

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [movieList, setMovieList] = useState([])
  const [trendingMovies, setTrendingMovies] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // debounce the search term to prevent making too many API request
  // by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

  // declaring an async function that will fetch movie data from TMDB.
  const fetchMovies = async (query = '') => {
    // flip your loading state to true before starting the request.
    setIsLoading(true)
    // reset any previous error message so the UI doesn’t show stale errors.
    setErrorMessage('')

    // begin the protected block. Everything inside can throw without crashing the component.
    try {
      // construct the full TMDB endpoint URL.
      // this uses the TMDB Discover endpoint, sorted by popularity.
      const endpoint = query
      ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`
      // send a GET request using your predefined headers (including the bearer token).
      // This is where the request actually happens.
      const response = await fetch(endpoint, API_OPTIONS)
      // If the HTTP status is NOT in the 200–299 range → you immediately force a failure.
      if (!response.ok) {
        throw new Error('Failed to fetch movies')
      }
      // parse the JSON body.
      // this turns the raw response into an object you can work with.
      const data = await response.json()
      // TMDB error handling
      if (data.status_code && data.status_code !== 1) {
        throw new Error(data.status_message || 'Failed to fetch movies')
      }
      // update state with the list of movies
      setMovieList(data.results || [])

      if (query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0])
      }
    } catch (error) {
      // Anything thrown above lands here.
      // log the error
      console.log(`Error fetching movies: ${error}`)
      // show a generic error message.
      setErrorMessage('Error fetching movies. Try again.')
    } finally {
      // Regardless of success or failure…

      // turn loading off.
      // This ensures the UI updates no matter what.
      setIsLoading(false)
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies()

      setTrendingMovies(movies)
    } catch (error) {
      console.error(`Error fetching trending movies: ${error}`);
    }
  }

  // This runs fetchMovies() one time when the component mounts.
  // Empty dependency array = run only on first render.
  useEffect(() => {
    fetchMovies(debouncedSearchTerm)
  }, [debouncedSearchTerm])

  useEffect(() => {
    loadTrendingMovies()
  },[])

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <img src="./hero-img.png" alt="Hero Banner" />
          <h1>
            Find <span className="text-gradient">Movies</span> You'll Enjoy
            Without Hassle
          </h1>

          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>

            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movies">
          <h2>All movies</h2>

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
