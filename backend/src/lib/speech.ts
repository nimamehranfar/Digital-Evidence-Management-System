/**
 * speech.ts
 *
 * Transcribes audio from a Buffer using the Azure AI Speech Service SDK
 * (microsoft-cognitiveservices-speech-sdk).
 *
 * Supports any format the Speech SDK can decode: WAV (PCM 16-bit), MP3,
 * OPUS/OGG, FLAC. The SDK handles container detection automatically.
 *
 * INSTALL:
 *   npm install microsoft-cognitiveservices-speech-sdk
 *
 * ENV VARS (set in Function App → Environment Variables):
 *   SPEECH_KEY    — Azure AI Speech service key (or reference Key Vault)
 *   SPEECH_REGION — Azure region, e.g. "eastus"
 */

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { getEnv } from "../config/env";

export type TranscriptionResult = {
  text: string;
  /** Number of recognised speech segments (utterances). */
  segments: number;
};

/**
 * Transcribe audio bytes to text using Azure AI Speech continuous recognition.
 *
 * Continuous recognition is used so that files longer than ~15 s are handled
 * correctly (unlike recognizeOnceAsync which only captures one utterance).
 *
 * @param buffer - Raw audio file bytes (WAV, MP3, FLAC, OGG/OPUS …)
 * @param language - BCP-47 language code, defaults to "en-US"
 * @returns Transcription text and segment count
 */
export async function transcribeAudio(
  buffer: Buffer,
  language = "en-US"
): Promise<TranscriptionResult> {
  const env = getEnv();

  if (!env.SPEECH_KEY || !env.SPEECH_REGION) {
    throw new Error(
      "SPEECH_KEY and SPEECH_REGION must be set to transcribe audio. " +
        "See docs/AZURE_SPEECH_SETUP.md for setup instructions."
    );
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(env.SPEECH_KEY, env.SPEECH_REGION);
  speechConfig.speechRecognitionLanguage = language;

  // Push the entire file buffer into a stream the SDK can consume.
  const pushStream = sdk.AudioInputStream.createPushStream();
  // Speech SDK expects an ArrayBuffer; Node Buffers may be backed by SharedArrayBuffer.
// Create a fresh Uint8Array copy so the backing store is a plain ArrayBuffer.
  const bytes = new Uint8Array(buffer);
  pushStream.write(bytes.buffer);

  pushStream.close();

  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  return new Promise<TranscriptionResult>((resolve, reject) => {
    const parts: string[] = [];

    // Fires for each fully recognized utterance (sentence/pause boundary).
    recognizer.recognized = (_sender: sdk.Recognizer, event: sdk.SpeechRecognitionEventArgs) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
        const text = event.result.text.trim();
        if (text) parts.push(text);
      }
    };

    // Fires when the audio stream ends and recognition completes.
    recognizer.sessionStopped = (_sender: sdk.Recognizer, _event: sdk.SessionEventArgs) => {
      recognizer.stopContinuousRecognitionAsync(
        () => resolve({ text: parts.join(" "), segments: parts.length }),
        (err: string) => reject(new Error(`Speech stop failed: ${err}`))
      );
    };

    // Fires on cancellation (including errors and end-of-stream).
    recognizer.canceled = (_sender: sdk.Recognizer, event: sdk.SpeechRecognitionCanceledEventArgs) => {
      if (event.reason === sdk.CancellationReason.Error) {
        recognizer.stopContinuousRecognitionAsync(
          () =>
            reject(
              new Error(
                `Speech recognition error: ${event.errorDetails} (code=${event.errorCode})`
              )
            ),
          () =>
            reject(
              new Error(
                `Speech recognition error: ${event.errorDetails} (code=${event.errorCode})`
              )
            )
        );
      } else {
        // CancellationReason.EndOfStream — normal completion for file input.
        recognizer.stopContinuousRecognitionAsync(
          () => resolve({ text: parts.join(" "), segments: parts.length }),
          (err: string) => reject(new Error(`Speech stop failed: ${err}`))
        );
      }
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        /* recognition started, wait for events */
      },
      (err: string) => reject(new Error(`Speech start failed: ${err}`))
    );
  });
}
