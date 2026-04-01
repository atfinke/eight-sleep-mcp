export function textResponse(value: unknown) {
  return {
    structuredContent: {
      result: value,
    },
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
