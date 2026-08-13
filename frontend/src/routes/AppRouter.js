import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '../pages/Home'
import NavBar from '../components/NavBar'
import FromImage from '../pages/FromImage'
import FromDocument from '../pages/FromDocument'
import FromAudio from '../pages/FromAudio'
import FromVideo from '../pages/FromVideo'

const AppRouter = () => {
    return (
        <BrowserRouter>
            <NavBar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path='/home' element={<Home />} />
                <Route path='/image' element={<FromImage />} />
                <Route path='/document' element={<FromDocument />} />
                <Route path='/audio' element={<FromAudio />} />
                <Route path='/video' element={<FromVideo />} />

            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter
