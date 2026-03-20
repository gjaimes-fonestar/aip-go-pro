import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 dark:text-gray-700">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">
          Page not found
        </h1>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
