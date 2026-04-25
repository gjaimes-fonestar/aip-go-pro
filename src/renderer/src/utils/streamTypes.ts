// Stream type constants — mirror the C++ aip::protocol::StreamType enum.
export const StreamType = {
  BackgroundMusic:  0,
  Voip:             1,
  Video:            2,
  ScheduledMessage: 3,
  Event:            4,
  InstantMessage:   5,
  Sip:              6,
  Unknown:          7,
} as const

/** Returns a human-readable label for a raw stream type byte. */
export function getStreamTypeLabel(type: number): string {
  switch (type) {
    case StreamType.BackgroundMusic:  return 'Background Music'
    case StreamType.Voip:             return 'VoIP'
    case StreamType.Video:            return 'Video'
    case StreamType.ScheduledMessage: return 'Scheduled Message'
    case StreamType.Event:            return 'Event'
    case StreamType.InstantMessage:   return 'Instant Message'
    case StreamType.Sip:              return 'SIP'
    default:                          return 'Unknown'
  }
}
