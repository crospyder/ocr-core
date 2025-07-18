import { Container, Card, Button, Table, TextInput, Group } from "@mantine/core";

export default function TestMantine() {
  return (
    <Container size="md" mt="lg">
      <Card shadow="md" radius="md" p="xl" withBorder>
        <h2>Test Mantine Dashboard</h2>
        <Group mb="md" mt="md">
          <TextInput label="Pretraga" placeholder="Upiši pojam..." />
          <Button color="yellow" variant="filled">Pretraži</Button>
        </Group>
        <Table striped withBorder highlightOnHover>
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Status</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dokument 1.pdf</td>
              <td>OCR</td>
              <td>15.07.2025</td>
            </tr>
            <tr>
              <td>Dokument 2.pdf</td>
              <td>Obrada</td>
              <td>13.07.2025</td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </Container>
  );
}
