import React from "react";

export function SectionCard(props: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 16 }}>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
