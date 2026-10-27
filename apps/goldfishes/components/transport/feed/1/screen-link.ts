// The screen's side of feed/1, outside React: the frame loop calls `contact`,
// `detach` and `depart` as often as it likes; every `sendIntervalMs` the link
// steps the phone slots (slots.mjs) and sends only what changed. The slots
// live here, beside the fish, so their timing is tuned by a reload. Offline,
// the slots still step and nothing is sent — the screen never waits on the
// relay — and on (re)join the whole state goes out as a snapshot.

import { events } from "@/socket/experiments/feed/1/protocol.mjs";
import { connectFeed, type FeedConnection, type FeedStatus } from "./connection";
import { feedCounter, feedLog } from "./log";
import { createSlots, ingest, snapshotSlots, tick, TUNING } from "./slots.mjs";
import type { FeedKeyword } from "./types";

type Contact = { fish: number; page: number; keyword: string; rank: number };

export class FeedScreenLink {
  status: FeedStatus = "connecting";
  private readonly connection: FeedConnection;
  private readonly runtime = createSlots();
  private contacts: Contact[] = [];
  private detached: number[] = [];
  private departures: number[] = [];
  private vocabulary: FeedKeyword[] = [];
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly counter = feedCounter("screen", ["contacts", "detached", "departures", "items", "pushes"] as const, () => {
    const lit = this.runtime.slots.filter((slot) => slot.attached).length;
    const hidden = document.hidden ? " — PAGE HIDDEN: its frame loop is paused, no fish move, nothing is sent" : "";
    return `${this.status}, ${lit} phones lit${hidden}`;
  });
  private readonly onVisibility = () => feedLog("screen", document.hidden ? "page hidden: the frame loop pauses, contacts stop" : "page visible again");

  constructor(onStatus?: (status: FeedStatus) => void) {
    this.connection = connectFeed(
      "screen",
      (status, error) => {
        if (status !== this.status) feedLog("screen", `status ${status}`, error ?? "");
        this.status = status;
        onStatus?.(status);
      },
      () => {
        feedLog("screen", `joined; vocabulary ${this.vocabulary.length} keywords`);
        this.sendSnapshot();
      },
    );
    this.connection.socket.on(events.snapshotRequest, () => this.sendSnapshot());
    this.timer = setInterval(() => this.step(), TUNING.sendIntervalMs);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** The screen's keywords; sent with every snapshot. */
  setVocabulary(vocabulary: FeedKeyword[]) {
    if (JSON.stringify(vocabulary) === JSON.stringify(this.vocabulary)) return;
    this.vocabulary = vocabulary;
    this.sendSnapshot();
  }

  /** A fish (its serial) has just reached `page`, shown as `keyword`; `rank` 0–1. */
  contact(fish: number, page: number, keyword: string, rank: number) {
    this.contacts.push({ fish, page, keyword, rank });
  }

  /** A fish has let go of its bubble (it lives on; its phone goes dark). */
  detach(fish: number) {
    this.detached.push(fish);
  }

  /** A fish has died or left. */
  depart(fish: number) {
    this.departures.push(fish);
  }

  private step() {
    this.counter.add("contacts", this.contacts.length);
    this.counter.add("detached", this.detached.length);
    this.counter.add("departures", this.departures.length);
    ingest(this.runtime, { contacts: this.contacts, detached: this.detached, departures: this.departures });
    this.contacts = [];
    this.detached = [];
    this.departures = [];
    const push = tick(this.runtime, Date.now());
    if (push.items.length === 0 && push.released.length === 0 && push.idle.length === 0) return;
    if (this.status !== "live") return;
    this.connection.socket.emit(events.pushIn, push);
    this.counter.add("pushes");
    this.counter.add("items", push.items.length);
  }

  private sendSnapshot() {
    if (this.status !== "live") return;
    this.connection.socket.emit(events.snapshotIn, { vocabulary: this.vocabulary, slots: snapshotSlots(this.runtime) });
  }

  close() {
    clearInterval(this.timer);
    this.counter.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.connection.close();
  }
}
