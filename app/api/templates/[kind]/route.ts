import { NextResponse } from "next/server";

const templates: Record<string, string> = {
  records: "company,role,year,college,selectedSkills,notes\nEY,Data Analyst,2025,RV College of Engineering,\"SQL, Excel, Python\",Technical round stayed on joins\n",
  questions: "company,role,roundType,question,topic\nEY,Data Analyst,Technical,Explain an inner join with a dataset you used,SQL joins\n",
  experiences: "company,role,roundType,experience\nEY,Data Analyst,Technical,The round stayed on a SQL workbook and a cleaning question.\n",
};

export async function GET(_request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  const body = templates[kind];
  if (!body) return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-template.csv"`,
    },
  });
}
