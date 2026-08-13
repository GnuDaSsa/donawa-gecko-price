"use client";

import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatExpoDateRange,
  getKoreaDateKey,
  getUpcomingExpoEvents,
  type ExpoEvent,
} from "@/lib/expo-events";

const SLIDE_INTERVAL_MS = 3_000;

export function HomeFeatureShowcase({
  events,
  initialKoreaDate,
}: {
  events: ExpoEvent[];
  initialKoreaDate: string;
}) {
  const [koreaDate, setKoreaDate] = useState(initialKoreaDate);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const upcomingEvents = useMemo(
    () => getUpcomingExpoEvents(events, koreaDate),
    [events, koreaDate],
  );
  const displayedIndex =
    upcomingEvents.length === 0 ? 0 : activeIndex % upcomingEvents.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    return () => media.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setKoreaDate(getKoreaDateKey(new Date()));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || upcomingEvents.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % upcomingEvents.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, upcomingEvents.length]);

  return (
    <div
      className={`home-feature-row${upcomingEvents.length === 0 ? " home-feature-row--single" : ""}`}
    >
      <section className="home-nearby-feature" aria-labelledby="home-nearby-title">
        <div className="home-nearby-feature__main">
          <span className="home-nearby-feature__icon" aria-hidden="true">
            <MapPin size={22} />
          </span>
          <h2 id="home-nearby-title">내 주변 판매처</h2>
        </div>
        <Link className="home-nearby-feature__cta" href="/nearby">
          주변 매장 보기 <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>

      {upcomingEvents.length > 0 && (
        <section
          className="expo-carousel"
          aria-label="예정된 파충류 박람회"
          aria-roledescription="carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
          }}
        >
          <div
            className="expo-carousel__track"
            style={{ transform: `translateX(-${displayedIndex * 100}%)` }}
          >
            {upcomingEvents.map((event, index) => (
              <a
                key={event.id}
                className="expo-carousel__slide"
                href={event.href}
                target="_blank"
                rel="noreferrer"
                aria-hidden={index !== displayedIndex}
                tabIndex={index === displayedIndex ? 0 : -1}
              >
                <Image
                  src={event.imageSrc}
                  alt={event.imageAlt}
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                  style={{ objectPosition: event.imagePosition ?? "center" }}
                />
                <span className="expo-carousel__shade" aria-hidden="true" />
                <span className="expo-carousel__copy">
                  <span className="expo-carousel__meta">
                    {formatExpoDateRange(event.startDate, event.endDate)} · {event.venue}
                  </span>
                  <strong>{event.title}</strong>
                  <span className="expo-carousel__link">
                    행사 보기 <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </span>
              </a>
            ))}
          </div>

          {upcomingEvents.length > 1 && (
            <div className="expo-carousel__dots" aria-label="박람회 배너 선택">
              {upcomingEvents.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  className={index === displayedIndex ? "is-active" : undefined}
                  aria-label={`${event.title} 보기`}
                  aria-current={index === displayedIndex ? "true" : undefined}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
