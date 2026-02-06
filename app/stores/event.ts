import { defineStore } from "pinia";

export const useEventStore = defineStore("event", () => {
  const event = useState("event", () => null);

  function setEvent(value: any) {
    event.value = value;
  }

  return {
    event,
    setEvent
  };
});
