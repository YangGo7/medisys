import React, { useState, useEffect } from 'react';
import './NewsCarousel.css';

// 이미지 import - 변수명 중복 해결
import banner1 from '../../../assets/images/carousel/banner1.PNG';
import banner2 from '../../../assets/images/carousel/banner2.PNG';
import banner3 from '../../../assets/images/carousel/banner3.PNG';
import banner4 from '../../../assets/images/carousel/banner4.PNG';
import banner5 from '../../../assets/images/carousel/banner5.PNG';  // banner5로 변경

const NewsCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const newsSlides = [
    {
      id: 1,
      image: banner1,
      alt: '배너 1'
    },
    {
      id: 2,
      image: banner2,
      alt: '배너 2'
    },
    {
      id: 3,
      image: banner3,
      alt: '배너 3'
    },
    {
      id: 4,
      image: banner4,
      alt: '배너 4'
    },
    {
      id: 5,
      image: banner5,  // banner5로 변경
      alt: '배너 5'
    }
  ];

  // 나머지 코드는 그대로...
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % newsSlides.length);
    }, 5000);

    return () => clearInterval(slideTimer);
  }, [newsSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % newsSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + newsSlides.length) % newsSlides.length);
  };

  return (
    <div className="carousel-container">
      <div className="carousel-content">
        <button className="carousel-btn prev" onClick={prevSlide}>
          ‹
        </button>
        
        <div className="carousel-slide">
          <img 
            src={newsSlides[currentSlide].image} 
            alt={newsSlides[currentSlide].alt}
            className="carousel-image"
          />
        </div>
        
        <button className="carousel-btn next" onClick={nextSlide}>
          ›
        </button>
      </div>
      
      <div className="carousel-indicators">
        {newsSlides.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsCarousel;