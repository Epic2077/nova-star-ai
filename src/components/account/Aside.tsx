"use client";

import { useState } from "react";
import { Item, ItemContent, ItemMedia, ItemTitle } from "../ui/item";
import { User } from "lucide-react";

const Aside = () => {
  const [active, setActive] = useState("profile");

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    setActive(hash);
  });

  return (
    <aside className="border-border hidden md:block w-64 border-r py-6 pr-6">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Profile</ItemTitle>
        </ItemContent>
      </Item>
    </aside>
  );
};

export default Aside;
