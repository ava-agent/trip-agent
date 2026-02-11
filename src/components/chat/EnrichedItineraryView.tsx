import React from 'react';
import { MapPin, Clock, DollarSign, Star, Hotel, Thermometer, Droplets, Wind } from 'lucide-react';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  date: string;
  source: 'real-time' | 'cache' | 'mock';
}

interface PlaceDetails {
  name: string;
  rating?: number;
  priceLevel?: number;
  openingHours?: string[];
  address?: string;
  description?: string;
  source: 'real-time' | 'cache' | 'mock';
}

interface HotelRecommendation {
  name: string;
  rating: number;
  pricePerNight: number;
  amenities: string[];
  image?: string;
  source: 'real-time' | 'cache' | 'mock';
}

interface EnrichedDay {
  date: string;
  activities: Array<{
    time: string;
    description: string;
    location?: string;
    placeDetails?: PlaceDetails;
  }>;
  weather?: WeatherData;
}

interface HotelDay {
  date: string;
  hotel?: HotelRecommendation;
  note?: string;
}

interface EnrichedItinerary {
  destination: string;
  startDate: string;
  endDate: string;
  days: EnrichedDay[];
  hotelStays: HotelDay[];
}

interface EnrichedItineraryViewProps {
  itinerary: EnrichedItinerary;
}

const DataSourceBadge: React.FC<{ source: 'real-time' | 'cache' | 'mock' }> = ({ source }) => {
  const styles = {
    'real-time': 'bg-green-100 text-green-800 border-green-300',
    'cache': 'bg-blue-100 text-blue-800 border-blue-300',
    'mock': 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const labels = {
    'real-time': '实时数据',
    'cache': '缓存数据',
    'mock': '演示数据',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[source]}`}
    >
      {labels[source]}
    </span>
  );
};

const WeatherCard: React.FC<{ weather: WeatherData }> = ({ weather }) => {
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case '晴':
        return '☀️';
      case 'cloudy':
      case '多云':
        return '⛅';
      case 'rainy':
      case '雨':
        return '🌧️';
      case 'snowy':
      case '雪':
        return '❄️';
      default:
        return '🌤️';
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getWeatherIcon(weather.condition)}</span>
          <div>
            <p className="text-sm text-gray-600">{weather.date}</p>
            <p className="font-medium text-gray-800">{weather.condition}</p>
          </div>
        </div>
        <DataSourceBadge source={weather.source} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-1">
          <Thermometer className="w-4 h-4 text-orange-500" />
          <span className="font-medium">{weather.temperature}°C</span>
        </div>
        <div className="flex items-center gap-1">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{weather.windSpeed}m/s</span>
        </div>
      </div>
    </div>
  );
};

const PlaceDetailsCard: React.FC<{ details: PlaceDetails; time: string; description: string }> = ({
  details,
  time,
  description,
}) => {
  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(level)].map((_, i) => (
          <DollarSign key={i} className="w-4 h-4 text-green-600" />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">{time}</span>
          </div>
          <h4 className="font-semibold text-gray-900">{details.name}</h4>
        </div>
        <DataSourceBadge source={details.source} />
      </div>

      <p className="text-gray-700 text-sm mb-3">{description}</p>

      {details.address && (
        <div className="flex items-start gap-2 mb-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <span>{details.address}</span>
        </div>
      )}

      <div className="flex items-center gap-4 mb-3">
        {renderStars(details.rating)}
        {renderPriceLevel(details.priceLevel)}
      </div>

      {details.openingHours && details.openingHours.length > 0 && (
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-xs font-medium text-gray-600 mb-1">营业时间</p>
          <ul className="text-sm text-gray-700 space-y-0.5">
            {details.openingHours.map((hours, index) => (
              <li key={index}>{hours}</li>
            ))}
          </ul>
        </div>
      )}

      {details.description && (
        <div className="mt-3 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-800 leading-relaxed">{details.description}</p>
        </div>
      )}
    </div>
  );
};

const HotelCard: React.FC<{ hotel: HotelRecommendation; date: string; note?: string }> = ({
  hotel,
  date,
  note,
}) => {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hotel className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-xs text-gray-600">{date}</p>
            <h4 className="font-semibold text-gray-900">{hotel.name}</h4>
          </div>
        </div>
        <DataSourceBadge source={hotel.source} />
      </div>

      <div className="flex items-center gap-4 mb-3">
        {hotel.rating > 0 && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(hotel.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            ))}
            <span className="text-sm font-medium ml-1">{hotel.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-medium text-gray-900">¥{hotel.pricePerNight}/晚</span>
        </div>
      </div>

      {hotel.amenities && hotel.amenities.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">设施服务</p>
          <div className="flex flex-wrap gap-1.5">
            {hotel.amenities.map((amenity, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {note && (
        <div className="bg-white/70 rounded-md p-2">
          <p className="text-xs text-gray-700">{note}</p>
        </div>
      )}
    </div>
  );
};

export const EnrichedItineraryView: React.FC<EnrichedItineraryViewProps> = ({ itinerary }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">{itinerary.destination}</h2>
        <p className="text-blue-100">
          {itinerary.startDate} 至 {itinerary.endDate}
        </p>
      </div>

      <div className="space-y-6">
        {itinerary.days.map((day, dayIndex) => {
          const hotelStay = itinerary.hotelStays.find((stay) => stay.date === day.date);

          return (
            <div key={dayIndex} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {dayIndex + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">第 {dayIndex + 1} 天</h3>
                  <p className="text-sm text-gray-600">{day.date}</p>
                </div>
              </div>

              {day.weather && <WeatherCard weather={day.weather} />}

              <div className="space-y-3">
                {day.activities.map((activity, activityIndex) => (
                  <div key={activityIndex}>
                    {activity.placeDetails ? (
                      <PlaceDetailsCard
                        details={activity.placeDetails}
                        time={activity.time}
                        description={activity.description}
                      />
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-600">{activity.time}</span>
                        </div>
                        <p className="text-gray-700">{activity.description}</p>
                        {activity.location && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{activity.location}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {hotelStay && hotelStay.hotel && (
                <HotelCard hotel={hotelStay.hotel} date={hotelStay.date} note={hotelStay.note} />
              )}

              {dayIndex < itinerary.days.length - 1 && (
                <hr className="border-gray-200 my-6" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnrichedItineraryView;
