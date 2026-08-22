import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Home from '../pages/Home'
import NavBar from '../components/NavBar'
import FromImage from '../pages/FromImage'
import FromDocument from '../pages/FromDocument'
import FromAudio from '../pages/FromAudio'
import FromVideo from '../pages/FromVideo'
import FromVideoToAudio from '../pages/FromVideoToAudio'
import IconGenerator from '../pages/IconGenerator'
import { resolveConversionSlug } from '../services/videoConversionsConfig'

/**
 * Resolves a dedicated `/video/:conversion` slug (e.g. "mp4-to-mkv",
 * "mp4-to-mp3") against the single videoConversionsConfig source of truth,
 * and renders the matching converter page preset -- see spec section 31.
 * An unrecognized slug falls back to the generic video converter.
 */
const VideoConversionRoute = () => {
  const { conversion } = useParams()
  const preset = resolveConversionSlug(conversion)

  if (!preset) return <FromVideo />
  if (preset.category === 'video-to-audio') {
    return <FromVideoToAudio source={preset.source} target={preset.target} />
  }
  return <FromVideo source={preset.source} target={preset.target} />
}

const AppRouter = () => {
    return (
        <BrowserRouter>
            <NavBar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path='/home' element={<Home />} />
                <Route path='/image' element={<FromImage />} />
                <Route path='/image-converter' element={<FromImage />} />
                <Route path='/image/icon-generator' element={<IconGenerator />} />
                <Route path='/image-converter/icon-generator' element={<IconGenerator />} />
                <Route path='/document' element={<FromDocument />} />
                <Route path='/audio' element={<FromAudio />} />
                <Route path='/video' element={<FromVideo />} />
                <Route path='/video/converter' element={<FromVideo />} />
                <Route path='/video-to-audio' element={<FromVideoToAudio />} />
                <Route path='/video/:conversion' element={<VideoConversionRoute />} />

            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter
