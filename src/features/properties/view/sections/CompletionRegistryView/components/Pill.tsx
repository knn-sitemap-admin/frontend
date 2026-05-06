const Pill = ({ text }: { text?: string }) => {
  return (
    <span className="inline-flex min-h-[32px] py-1 items-center rounded-lg px-3 text-sm border bg-blue-50 text-blue-700 whitespace-normal break-all">
      {text || "-"}
    </span>
  );
};

export default Pill;
